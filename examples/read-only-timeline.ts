import { MilestoneJournalSDK } from '../src';

async function main() {
  const sdk = new MilestoneJournalSDK({
    contractAddress: process.env.CONTRACT_ADDRESS ?? 'SP123...',
    contractName: process.env.CONTRACT_NAME ?? 'milestone-journal',
    network: (process.env.STACKS_NETWORK as 'mainnet' | 'testnet' | 'devnet') ?? 'mainnet',
    apiBaseUrl: process.env.STACKS_API_BASE,
    defaultSender: process.env.DEFAULT_SENDER,
  });

  const projects = await sdk.getAllProjects();
  console.log(`Found ${projects.length} project(s)`);

  for (const projectEntry of projects) {
    const timeline = await sdk.getProjectTimeline(projectEntry.id, process.env.VIEWER_PRINCIPAL);

    console.log(`\nProject #${projectEntry.id.toString()} - ${projectEntry.project.title}`);
    console.log(`Attestations: ${timeline.length}`);

    for (const item of timeline) {
      console.log({
        id: item.id.toString(),
        milestone: item.attestation.milestone.toString(),
        author: item.attestation.author,
        coSigns: item.coSignCount.toString(),
        hasCoSigned: item.hasCoSigned,
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
