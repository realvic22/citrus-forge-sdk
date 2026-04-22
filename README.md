# citrus-forge-sdk

TypeScript SDK for interacting with the `milestone-journal` Clarity contract.

## Features

- Typed read-only helpers for projects, attestations, co-sign status, and per-project timeline reads
- Typed contract call payload builders for create-project, post-attestation, and co-sign flows
- Compatible with `@stacks/connect` request APIs
- Publish-ready setup with lint, typecheck, tests, and build checks

## Installation

```bash
npm install @rednevsky/citrus-forge-sdk @stacks/transactions
```

## Quick Start

```ts
import { MilestoneJournalSDK } from "@rednevsky/citrus-forge-sdk";

const sdk = new MilestoneJournalSDK({
  contractAddress: "SP123...",
  contractName: "milestone-journal",
  network: "mainnet",
  apiBaseUrl: "https://api.hiro.so",
});

const projectNonce = await sdk.getProjectNonce();
const projects = await sdk.getAllProjects();
```

## Build tx payloads

```ts
const createPayload = sdk.buildCreateProject("Neon Engine", "Project summary");
const postPayload = sdk.buildPostAttestation(
  1,
  2,
  "Reached milestone 2",
  "bafy...",
);
const coSignPayload = sdk.buildCoSign(1);
```

## Execute with Stacks Connect

```ts
import { request } from "@stacks/connect";

await sdk.requestContractCall(request, postPayload);
```

## End-to-End Example

A full create-project -> post-attestation -> co-sign flow is available in:

- `examples/connect-flow.ts`

It demonstrates SDK usage with `@stacks/connect` request calls and read-back timeline checks.

For backendless dashboard and analytics reads (no wallet tx calls), use:

- `examples/read-only-timeline.ts`

This example fetches all projects and prints per-project attestation timeline data with optional viewer co-sign checks.

## API Methods

- `buildCreateProject(title, summary)`
- `buildPostAttestation(projectId, milestone, note, artifactCid?)`
- `buildCoSign(attestationId)`
- `getProjectNonce()`
- `getAttestationNonce()`
- `getProject(projectId)`
- `getAttestation(attestationId)`
- `getProjectAttestationId(projectId, localId)`
- `getCoSignCount(attestationId)`
- `hasCoSigned(attestationId, principal)`
- `getAllProjects()`
- `getProjectTimeline(projectId, viewer?)`

## Development

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Publish checks

```bash
npm run prepublishOnly
npm run pack:check
npm run publish:dry-run
```

## License

MIT
