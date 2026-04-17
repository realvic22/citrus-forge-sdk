import { describe, expect, it } from 'vitest';
import { Cl, cvToHex } from '@stacks/transactions';
import { MilestoneJournalSDK } from '../src';

const SENDER = 'SP000000000000000000002Q6VF78';
const VIEWER = 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG';

describe('MilestoneJournalSDK', () => {
  it('builds create-project payload', () => {
    const sdk = new MilestoneJournalSDK({
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'milestone-journal',
      network: 'mainnet',
    });

    const payload = sdk.buildCreateProject('Neon Engine', 'Cyberpunk productivity suite');

    expect(payload.contract).toBe('SP000000000000000000002Q6VF78.milestone-journal');
    expect(payload.functionName).toBe('create-project');
    expect(payload.functionArgs).toHaveLength(2);
    expect(payload.functionArgs[0]?.startsWith('0x')).toBe(true);
  });

  it('builds post-attestation payload with optional cid', () => {
    const sdk = new MilestoneJournalSDK({
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'milestone-journal',
      network: 'mainnet',
    });

    const payload = sdk.buildPostAttestation(1, 2, 'Reached M2', 'bafy-demo');

    expect(payload.functionName).toBe('post-attestation');
    expect(payload.functionArgs).toHaveLength(4);
  });

  it('reads project nonce', async () => {
    const resultHex = cvToHex(Cl.ok(Cl.uint(3)));

    const sdk = new MilestoneJournalSDK({
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'milestone-journal',
      network: 'mainnet',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            okay: true,
            result: resultHex,
          }),
          { status: 200 },
        ),
    });

    const nonce = await sdk.getProjectNonce();
    expect(nonce).toBe(3n);
  });

  it('reads optional project tuple', async () => {
    const resultHex = cvToHex(
      Cl.ok(
        Cl.some(
          Cl.tuple({
            owner: Cl.principal(SENDER),
            title: Cl.stringUtf8('Neon Engine'),
            summary: Cl.stringUtf8('Tooling and docs'),
            'created-height': Cl.uint(12),
            'attestation-count': Cl.uint(4),
          }),
        ),
      ),
    );

    const sdk = new MilestoneJournalSDK({
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'milestone-journal',
      network: 'mainnet',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            okay: true,
            result: resultHex,
          }),
          { status: 200 },
        ),
    });

    const project = await sdk.getProject(1);
    expect(project?.owner).toBe(SENDER);
    expect(project?.attestationCount).toBe(4n);
  });

  it('reads has-cosigned bool', async () => {
    const resultHex = cvToHex(Cl.ok(Cl.bool(true)));

    const sdk = new MilestoneJournalSDK({
      contractAddress: 'SP000000000000000000002Q6VF78',
      contractName: 'milestone-journal',
      network: 'mainnet',
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            okay: true,
            result: resultHex,
          }),
          { status: 200 },
        ),
    });

    const has = await sdk.hasCoSigned(1, VIEWER);
    expect(has).toBe(true);
  });
});
