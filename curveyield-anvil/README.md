# CurveYield Persistent Anvil Node

This directory is the minimal CurveYield deployment surface extracted from the upstream `ethui/stacks` behavior needed by Contract-Automation.

It intentionally does **not** deploy the Stacks frontend, Phoenix API, account system, MCP, explorer, Graph Node, IPFS, subgraph services, or public node-provisioning functions.

## Runtime

The node runs one persistent Ethereum Anvil fork with:

- Ethereum chain ID 1
- upstream `--fork-url`
- persistent `--state`
- `--preserve-historical-states`
- `--auto-impersonate`
- `--no-rate-limit`
- graceful Docker shutdown long enough for Anvil to write state

The public edge is Caddy. It exposes one HTTPS JSON-RPC URL at:

`https://<RPC_DOMAIN>/<RPC_PATH_TOKEN>`

The secret path is not committed.

## Required host

The production workflow requires a Linux GitHub self-hosted runner with these labels:

- `self-hosted`
- `linux`
- `curveyield-anvil`

The runner host must have:

- Docker Engine
- Docker Compose v2
- curl
- inbound TCP 80 and 443
- DNS for `RPC_DOMAIN` pointed at the host

The persistent Docker volumes remain on that host across workflow runs and container restarts.

## GitHub configuration

Repository variable:

- `CURVEYIELD_ANVIL_SELF_HOSTED_ENABLED=true`

Repository secrets:

- `ETHEREUM_SOURCE_RPC_URL`
- `RPC_DOMAIN`
- `RPC_PATH_TOKEN`

The source RPC remains server-side. Contract-Automation receives only the CurveYield Anvil endpoint.

## Deployment

The canonical GitHub workflow is:

`.github/workflows/curveyield-anvil-node.yml`

Pull requests and the implementation branch run disposable qualification on GitHub-hosted runners.

Production deployment runs only by manual workflow dispatch and only when `CURVEYIELD_ANVIL_SELF_HOSTED_ENABLED` is exactly `true`.

## Contract-Automation integration

After production qualification, set Contract-Automation's existing:

`SIM_ARCHIVE_PRIMARY_ETHEREUM_01`

to the CurveYield RPC endpoint.

The Contract-Automation simulation runner can then use this persistent Anvil as its fork source while continuing to create its own local mutable simulation node when required.
