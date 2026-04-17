import { request } from '@stacks/connect';
import { MilestoneJournalSDK } from '../src';

async function main() {
  const sdk = new MilestoneJournalSDK({
    contractAddress: process.env.CONTRACT_ADDRESS ?? 'SP123...',
    contractName: process.env.CONTRACT_NAME ?? 'milestone-journal',
    network: (process.env.STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') ?? 'testnet',
    apiBaseUrl: process.env.STACKS_API_BASE,
  });

  const createProjectPayload = sdk.buildCreateProject('Neon Engine', 'Shared milestone journal');
  await sdk.requestContractCall(request, createProjectPayload);

  const postAttestationPayload = sdk.buildPostAttestation(
    1,
    1,
    'M1 complete: MVP shipped to testnet',
    'bafybeigdyrztu5gixx4n4examplecid',
  );
  await sdk.requestContractCall(request, postAttestationPayload);

  const coSignPayload = sdk.buildCoSign(1);
  await sdk.requestContractCall(request, coSignPayload);

  const timeline = await sdk.getProjectTimeline(1);
  console.log('Timeline entries:', timeline.length);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
