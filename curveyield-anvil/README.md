# CurveYield Persistent Anvil Fleet

This directory is the minimal CurveYield deployment surface derived from the proven Anvil behavior in upstream `ethui/stacks`.

It intentionally does **not** deploy the Stacks frontend, Phoenix management API, account/authentication system, MCP, explorer, Graph Node, IPFS, subgraph services, or public node-provisioning functions.

## Fixed fleet

The deployment contains exactly four persistent Ethereum Anvil forks:

- `ethereum-01`
- `ethereum-02`
- `ethereum-03`
- `ethereum-04`

Each node has its own process/container and persistent state volume. Native RPC ports are bound only to host loopback and are not Internet-facing.

The public HTTPS endpoints are:

- `https://<RPC_DOMAIN>/<RPC_PATH_TOKEN>/ethereum-01`
- `https://<RPC_DOMAIN>/<RPC_PATH_TOKEN>/ethereum-02`
- `https://<RPC_DOMAIN>/<RPC_PATH_TOKEN>/ethereum-03`
- `https://<RPC_DOMAIN>/<RPC_PATH_TOKEN>/ethereum-04`

The domain, path token, and upstream source RPC are deployment secrets and are never committed.

## Runtime behavior

Every node is server-configured with:

- Ethereum chain ID 1
- upstream `--fork-url`
- persistent `--state`
- `--preserve-historical-states`
- `--auto-impersonate`
- `--no-rate-limit`
- a 45-second graceful Docker stop window
- readiness checks for chain identity and block retrieval

The Foundry image is pinned to the exact image digest qualified as Anvil `1.5.1-stable` (commit `b0a9dd9c`).

The entrypoint preserves the useful recovery behavior from upstream Stacks: if Anvil rejects a persisted `--state` file with its state-parse usage error, that file is renamed to `state.json.corrupt.<timestamp>.<pid>` and the node retries once from the upstream fork instead of wedging forever.

## Ethereum source RPC

The fleet still needs one upstream Ethereum source RPC for fork state that has not yet been fetched.

That source is supplied only on the persistent host as:

`ETHEREUM_SOURCE_RPC_URL`

Contract-Automation never receives this source URL. It receives only the stable CurveYield endpoint, so the upstream provider can later be replaced without changing Contract-Automation.

## Required persistent host

GitHub-hosted Actions runners are ephemeral and cannot remain an RPC server after a workflow exits.

Production deployment therefore requires one Linux GitHub self-hosted runner with these labels:

- `self-hosted`
- `linux`
- `curveyield-anvil`

The runner host must have:

- Docker Engine
- Docker Compose v2
- curl
- inbound TCP 80 and 443
- DNS for `RPC_DOMAIN` pointed at the host

The Anvil and Caddy volumes remain on that machine across workflow runs and container restarts.

## GitHub configuration

Repository variable:

- `CURVEYIELD_ANVIL_SELF_HOSTED_ENABLED=true`

Repository secrets:

- `ETHEREUM_SOURCE_RPC_URL`
- `RPC_DOMAIN`
- `RPC_PATH_TOKEN` (at least 32 characters)

## Canonical workflow

The only CurveYield deployment/qualification workflow is:

`.github/workflows/curveyield-anvil-node.yml`

Pull requests run disposable qualification on GitHub-hosted runners. Qualification builds the pinned image, starts all four nodes, runs the existing Contract-Automation archive identity/state/code probes against every node, tests the required JSON-RPC surface, proves mutation persistence through restart, proves corrupt-state quarantine/recovery, and proves another Anvil can use a CurveYield node as its fork source.

Production deployment is manual and is enabled only when `CURVEYIELD_ANVIL_SELF_HOSTED_ENABLED` is exactly `true`.

## Contract-Automation integration

After the persistent host deployment passes, set Contract-Automation's existing secret:

`SIM_ARCHIVE_PRIMARY_ETHEREUM_01`

to the `ethereum-01` CurveYield endpoint.

The remaining nodes can be retained as fixed secondary/spare endpoints without adding a node-creation API.
