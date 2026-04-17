export type StacksNetwork = 'mainnet' | 'testnet' | 'devnet';

export interface MilestoneJournalSDKConfig {
  contractAddress: string;
  contractName: string;
  network?: StacksNetwork;
  apiBaseUrl?: string;
  defaultSender?: string;
  fetchFn?: typeof fetch;
}

export interface ContractCallPayload {
  contract: `${string}.${string}`;
  functionName: string;
  functionArgs: string[];
  network: StacksNetwork;
  postConditionMode: 'deny' | 'allow';
  sponsored: boolean;
}

export interface ProjectRecord {
  owner: string;
  title: string;
  summary: string;
  createdHeight: bigint;
  attestationCount: bigint;
}

export interface AttestationRecord {
  projectId: bigint;
  author: string;
  milestone: bigint;
  note: string;
  artifactCid: string | null;
  createdHeight: bigint;
}

export interface TimelineAttestation {
  id: bigint;
  attestation: AttestationRecord;
  coSignCount: bigint;
  hasCoSigned?: boolean;
}
