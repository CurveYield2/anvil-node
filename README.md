# CurveYield Anvil Node

Private CurveYield simulation infrastructure derived from the Anvil lifecycle and persistence behavior of `ethui/stacks`.

## Production surface

The repository intentionally contains only the files required to build, qualify, and deploy the CurveYield fixed Anvil fleet.

The deployable system provides four persistent Ethereum Anvil fork endpoints:

- `ethereum-01`
- `ethereum-02`
- `ethereum-03`
- `ethereum-04`

There is no browser frontend, user/account system, public stack creation API, MCP service, explorer, Graph Node, IPFS service, subgraph deployment service, or dynamic third-party node provisioning.

Implementation and host requirements are documented in:

`curveyield-anvil/README.md`

The canonical GitHub workflow is:

`.github/workflows/curveyield-anvil-node.yml`

## Provenance

The repository was initialized from `ethui/stacks` commit:

`9a943eca6e1f093ec449211aa7f1f11a6437f123`

The retained runtime adapts the upstream project's proven Anvil launch flags, persistence model, readiness behavior, graceful shutdown requirement, and corrupt-state recovery behavior to a fixed CurveYield-only fleet.

Git history preserves the original imported source and subsequent reduction to this minimal production surface.
