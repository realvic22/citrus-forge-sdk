import {
  cvToHex,
  cvToJSON,
  hexToCV,
  noneCV,
  principalCV,
  someCV,
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  type ClarityValue,
} from '@stacks/transactions';
import {
  asBigInt,
  asBool,
  asObject,
  asText,
  unwrapOptional,
  unwrapReadOnlyResponse,
} from './parsers';
import {
  MilestoneJournalConfigError,
  MilestoneJournalRequestError,
  MilestoneJournalResponseError,
} from './errors';
import type {
  AttestationRecord,
  ContractCallPayload,
  MilestoneJournalSDKConfig,
  ProjectRecord,
  StacksNetwork,
  TimelineAttestation,
} from './types';

const DEFAULT_API_BASE_BY_NETWORK: Record<StacksNetwork, string> = {
  mainnet: 'https://api.hiro.so',
  testnet: 'https://api.testnet.hiro.so',
  devnet: 'http://localhost:3999',
};

type ConnectRequest = (
  method: 'stx_callContract',
  params: {
    contract: `${string}.${string}`;
    functionName: string;
    functionArgs: string[];
    network: StacksNetwork;
    postConditionMode: 'deny' | 'allow';
    sponsored: boolean;
  },
) => Promise<unknown>;

export class MilestoneJournalSDK {
  private readonly contractAddress: string;
  private readonly contractName: string;
  private readonly network: StacksNetwork;
  private readonly apiBaseUrl: string;
  private readonly defaultSender: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(config: MilestoneJournalSDKConfig) {
    if (!config.contractAddress || !config.contractName) {
      throw new MilestoneJournalConfigError('contractAddress and contractName are required');
    }

    this.contractAddress = config.contractAddress;
    this.contractName = config.contractName;
    this.network = config.network ?? 'mainnet';
    this.apiBaseUrl = (config.apiBaseUrl ?? DEFAULT_API_BASE_BY_NETWORK[this.network]).replace(/\/$/, '');
    this.defaultSender = config.defaultSender;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  getContractId(): `${string}.${string}` {
    return `${this.contractAddress}.${this.contractName}`;
  }

  buildCreateProject(title: string, summary: string): ContractCallPayload {
    return this.buildPayload('create-project', [stringUtf8CV(title), stringUtf8CV(summary)]);
  }

  buildPostAttestation(
    projectId: bigint | number,
    milestone: bigint | number,
    note: string,
    artifactCid?: string,
  ): ContractCallPayload {
    return this.buildPayload('post-attestation', [
      uintCV(projectId),
      uintCV(milestone),
      stringUtf8CV(note),
      artifactCid ? someCV(stringAsciiCV(artifactCid)) : noneCV(),
    ]);
  }

  buildCoSign(attestationId: bigint | number): ContractCallPayload {
    return this.buildPayload('co-sign', [uintCV(attestationId)]);
  }

  async requestContractCall(request: ConnectRequest, payload: ContractCallPayload): Promise<unknown> {
    return request('stx_callContract', {
      contract: payload.contract,
      functionName: payload.functionName,
      functionArgs: payload.functionArgs,
      network: payload.network,
      postConditionMode: payload.postConditionMode,
      sponsored: payload.sponsored,
    });
  }

  async getProjectNonce(sender?: string): Promise<bigint> {
    const raw = await this.callReadOnly('get-project-nonce', [], sender);
    return asBigInt(raw, 'get-project-nonce');
  }

  async getAttestationNonce(sender?: string): Promise<bigint> {
    const raw = await this.callReadOnly('get-attestation-nonce', [], sender);
    return asBigInt(raw, 'get-attestation-nonce');
  }

  async getProject(projectId: bigint | number, sender?: string): Promise<ProjectRecord | null> {
    const raw = await this.callReadOnly('get-project', [uintCV(projectId)], sender);
    const optional = unwrapOptional<Record<string, unknown>>(raw, 'get-project');
    if (!optional) return null;

    const tuple = asObject(optional, 'get-project');
    return {
      owner: asText(tuple.owner, 'project.owner'),
      title: asText(tuple.title, 'project.title'),
      summary: asText(tuple.summary, 'project.summary'),
      createdHeight: asBigInt(tuple['created-height'], 'project.created-height'),
      attestationCount: asBigInt(tuple['attestation-count'], 'project.attestation-count'),
    };
  }

  async getAttestation(attestationId: bigint | number, sender?: string): Promise<AttestationRecord | null> {
    const raw = await this.callReadOnly('get-attestation', [uintCV(attestationId)], sender);
    const optional = unwrapOptional<Record<string, unknown>>(raw, 'get-attestation');
    if (!optional) return null;

    const tuple = asObject(optional, 'get-attestation');
    const cidOptional = unwrapOptional<unknown>(tuple['artifact-cid'], 'attestation.artifact-cid');

    return {
      projectId: asBigInt(tuple['project-id'], 'attestation.project-id'),
      author: asText(tuple.author, 'attestation.author'),
      milestone: asBigInt(tuple.milestone, 'attestation.milestone'),
      note: asText(tuple.note, 'attestation.note'),
      artifactCid: cidOptional === null ? null : asText(cidOptional, 'attestation.artifact-cid'),
      createdHeight: asBigInt(tuple['created-height'], 'attestation.created-height'),
    };
  }

  async getProjectAttestationId(projectId: bigint | number, localId: bigint | number, sender?: string): Promise<bigint | null> {
    const raw = await this.callReadOnly('get-project-attestation-id', [uintCV(projectId), uintCV(localId)], sender);
    const optional = unwrapOptional<unknown>(raw, 'get-project-attestation-id');
    if (optional === null) return null;
    return asBigInt(optional, 'project-attestation-id');
  }

  async getCoSignCount(attestationId: bigint | number, sender?: string): Promise<bigint> {
    const raw = await this.callReadOnly('get-co-sign-count', [uintCV(attestationId)], sender);
    return asBigInt(raw, 'get-co-sign-count');
  }

  async hasCoSigned(attestationId: bigint | number, who: string, sender?: string): Promise<boolean> {
    const raw = await this.callReadOnly('has-cosigned', [uintCV(attestationId), principalCV(who)], sender);
    return asBool(raw, 'has-cosigned');
  }

  async getAllProjects(sender?: string): Promise<Array<{ id: bigint; project: ProjectRecord }>> {
    const nonce = await this.getProjectNonce(sender);
    if (nonce < 1n) return [];

    const projects = await Promise.all(
      Array.from({ length: Number(nonce) }, (_, i) => {
        const id = BigInt(i + 1);
        return this.getProject(id, sender).then((project) => ({ id, project }));
      }),
    );

    return projects
      .filter((item): item is { id: bigint; project: ProjectRecord } => item.project !== null)
      .sort((a, b) => Number(a.id - b.id));
  }

  async getProjectTimeline(projectId: bigint | number, viewer?: string, sender?: string): Promise<TimelineAttestation[]> {
    const project = await this.getProject(projectId, sender);
    if (!project) return [];

    const total = Number(project.attestationCount);
    if (total < 1) return [];

    const ids = await Promise.all(
      Array.from({ length: total }, (_, i) => this.getProjectAttestationId(projectId, BigInt(i + 1), sender)),
    );

    const validIds = ids.filter((id): id is bigint => id !== null);

    const timeline = await Promise.all(
      validIds.map(async (id) => {
        const [attestation, coSignCount, viewerCoSigned] = await Promise.all([
          this.getAttestation(id, sender),
          this.getCoSignCount(id, sender),
          viewer ? this.hasCoSigned(id, viewer, sender) : Promise.resolve(undefined),
        ]);

        if (!attestation) return null;
        return {
          id,
          attestation,
          coSignCount,
          ...(typeof viewerCoSigned === 'boolean' ? { hasCoSigned: viewerCoSigned } : {}),
        };
      }),
    );

    const filtered: TimelineAttestation[] = [];
    for (const item of timeline) {
      if (item !== null) filtered.push(item);
    }

    return filtered.sort((a, b) => Number(b.id - a.id));
  }

  private buildPayload(functionName: string, args: ClarityValue[]): ContractCallPayload {
    return {
      contract: this.getContractId(),
      functionName,
      functionArgs: args.map((arg) => cvToHex(arg)),
      network: this.network,
      postConditionMode: 'deny',
      sponsored: false,
    };
  }

  private async callReadOnly(functionName: string, args: ClarityValue[], sender?: string): Promise<unknown> {
    const response = await this.fetchFn(
      `${this.apiBaseUrl}/v2/contracts/call-read/${this.contractAddress}/${this.contractName}/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: sender ?? this.defaultSender ?? this.contractAddress,
          arguments: args.map((arg) => cvToHex(arg)),
        }),
      },
    );

    if (!response.ok) {
      throw new MilestoneJournalRequestError(`Read-only request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      okay?: boolean;
      result?: string;
      cause?: string;
    };

    if (!payload.okay || !payload.result) {
      throw new MilestoneJournalResponseError(payload.cause ?? 'Read-only endpoint returned invalid response');
    }

    const clarityValue = hexToCV(payload.result);
    const parsed = cvToJSON(clarityValue);
    return unwrapReadOnlyResponse(parsed);
  }
}
