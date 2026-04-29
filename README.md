# activity-ranker

Yarn classic monorepo for a Serverless-ready NestJS back end, parallel Nuxt and Next.js frontends, and a shared workspace for schemas, contracts, and transport-safe types.

## Workspace overview

- `@activity-ranker/be` - NestJS service with REST and GraphQL endpoints, API-key auth, Open-Meteo integrations, and Serverless packaging.
- `@activity-ranker/fe` - Nuxt web application with the Venture theme, autocomplete search, single-location enforcement, and a visible REST/GraphQL transport toggle.
- `@activity-ranker/next` - Next.js App Router mirror of the Venture frontend with the same proxy-backed activity search and ranking flows.
- `@activity-ranker/shared` - Shared Zod schemas, TypeScript contracts, constants, and transport enums.

## Quick start

The lowest-friction first run is Docker:

```bash
cd /Users/tafadzwagonera/Projects/activity-ranker
docker compose up --build -d
```

Default local URLs:

- Backend: `http://localhost:3000`
- Backend health check: `http://localhost:3000/health`
- Nuxt frontend: `http://localhost:3001`
- Next.js frontend: `http://localhost:3002`

What is already defaulted for you:

- The frontend proxies backend requests through Nuxt server routes under `/api/locations/*`.
- The Next.js mirror proxies backend requests through Next route handlers under `/api/locations/*`.
- The frontend uses `http://localhost:3000` by default for local Node/Yarn development.
- Docker sets the Nuxt and Next upstream backend URL to `http://be:3000` inside the Compose network.
- The backend local public API defaults to port `3000`.
- Dev auth keys default to `public-dev-key` and `internal-dev-key`.
- If `docker compose up --build -d` was interrupted, stale `activity-ranker-*` containers can remain and cause a name conflict on the next run. Clean them with `docker compose down --volumes --remove-orphans` before starting again. The current Dockerfile installs dependencies during image build, so a healthy startup should no longer require a separate `deps` container.

Stop the Docker stack with:

```bash
yarn dev:docker:down
```

## Local Node/Yarn setup

Use this path when you do not want Docker:

```bash
cd /Users/tafadzwagonera/Projects/activity-ranker
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --non-interactive
yarn lefthook install
```

## Observability and metrics

The frontend server proxies and the backend are the observability boundaries for this system. Nuxt server routes, Next route handlers, and the Nest backend should emit correlated structured logs with the same `x-request-id` so request flow, failures, and latency can be followed across those boundaries without relying on browser logs.

Structured logs are the source of truth for operational insight. The shared internal log contract standardizes `event`, `requestId`, `path` or operation, `method`, `statusCode`, `durationInMs`, and `transport`, with optional upstream context such as `provider`, `operation`, and `outcome` when a boundary needs to distinguish validation failures, upstream failures, or provider-specific issues.

Metrics will be derived from those structured logs rather than hand-built custom metrics first. Once the log fields are stable, Terraform will provision dashboards and threshold-based alarms from the log data so latency, failure rate, and boundary-specific error patterns stay queryable and consistent across environments.

Alarm handling is operational, not cosmetic. Threshold alarms will notify the on-call engineer, who is expected to investigate the correlated request path, triage the failing boundary, and resolve or escalate the incident based on the structured log evidence.

Useful commands:

- `yarn dev:be` / `yarn dev:fe` / `yarn dev:next` - Starts the NestJS HTTP server on port `3000`, the Nuxt web app on port `3001`, or the Next.js web app on port `3002`.
- `yarn dev:docker` / `yarn dev:docker:down` - Starts or stops the Docker-first local development stack with the backend, Nuxt frontend, and Next.js frontend.
- `yarn build` - Builds shared code, the backend package, and the frontend production bundle.
- `yarn format:check` / `yarn lint` / `yarn typecheck` - Runs repo quality gates.
- `yarn test:ci` - Runs shared, backend, and frontend tests in CI mode.
- `yarn coverage:report` / `yarn coverage:check` - Runs package coverage, merges reports at the repo root, and optionally enforces the combined threshold.
- `yarn workspace @activity-ranker/fe test:e2e` - Starts the built Nuxt app and runs the browser-only Playwright suite.

## Local ports and invocation patterns

- `yarn dev:be` runs the Nest HTTP server directly, not `serverless offline`.
- The backend HTTP entrypoint defaults to `http://localhost:3000`.
- Use `PORT=3000 yarn dev:be` to override the backend HTTP port for local development.
- Use `PORT=3000 yarn workspace @activity-ranker/be start` only when running the built Nest app directly.
- `NUXT_API_BASE_URL` only needs to be set when the frontend should target a non-default backend host or port.
- `NUXT_API_INTERNAL_KEY` is optional for local development because the frontend defaults to `internal-dev-key`.
- `NEXT_API_BASE_URL` only needs to be set when the Next.js mirror should target a non-default backend host or port.
- `NEXT_API_INTERNAL_KEY` is optional for local development because the Next.js mirror defaults to `internal-dev-key`.
- `docker compose up --build -d` publishes the Next.js mirror on `http://localhost:3002`, the Nuxt app on `http://localhost:3001`, and wires both server-side proxies to `http://be:3000`.
- The compose stack no longer depends on a runtime `deps` service; if you are resuming from an older dirty stack, clear volumes with `docker compose down --volumes --remove-orphans` before restarting.

## Runtime behavior

- Authenticated API routes accept either `XApiKey` or `XInternalKey`.
- The Nuxt app exposes both `REST` and `GraphQL` transports to the user.
- The Nuxt browser app uses same-origin `/api/locations/*` proxy routes instead of calling the backend directly.
- The Next.js mirror exposes the same transport choices and uses same-origin `/api/locations/*` route handlers instead of calling the backend directly.
- The backend proxies location autocomplete through Open-Meteo geocoding.
- Daily activity rankings always include `skiing`, `surfing`, `outdoorSightseeing`, and `indoorSightseeing`.
- Surfing remains available globally, but confidence is reduced when no curated surf spot is close enough to the requested location.

## Shared contract imports

Use `camelCase` for repo-owned non-literal shared exports:

```ts
import { activityIds, headerNames } from "@activity-ranker/shared";
```

Use uppercase only for literal-style constants or framework-required tokens. The NestJS DI tokens remain the explicit exception:

```ts
import { GEOCODING_PROVIDER, WEATHER_PROVIDER } from "./weather.constants";
```

## Build and deployment guidance

- Build from the root with `yarn build` so shared contracts compile before backend and frontend consumers.
- Keep local development on Node.js `v24.x`, while `packages/be/serverless.yml` remains on AWS runtime `nodejs20.x`.
- Prefer `PORT=3000 yarn dev:be` when running the backend locally so the documented REST and GraphQL examples match the active port.
- Package the backend with `yarn workspace @activity-ranker/be build`.
- Deploy the backend with `yarn workspace @activity-ranker/be deploy` after AWS credentials and stage configuration are in place.
- Preview the frontend production build with `yarn workspace @activity-ranker/fe preview`.

## Scaling considerations

- AWS Lambda with API Gateway REST API is the recommended fit for this workload because requests are bursty, short-lived, and weather lookups benefit from request-driven scaling.
- API Gateway REST API is used instead of HTTP API because the documented stage-cache support and cache key parameter configuration are available there.
- The cached public ranking endpoint is `GET /locations/{latitude}/{longitude}/rank-activities` with a `ttl` of `1800` seconds and latitude/longitude cache keys.
- Application-level domain boundaries keep the weather integration swappable if provider or cache strategy changes later.

## Security considerations

- External clients can authenticate with `XApiKey`, while the Nuxt server proxy authenticates upstream backend calls with `XInternalKey`.
- The browser no longer receives the internal key; the trust boundary now sits at the Nuxt server layer.
- Cookies are intentionally not used for location or transport preferences in v1; the frontend stores theme and transport locally in the browser only.
- The backend centralizes third-party weather and geocoding calls so request headers, logging, and failure handling stay under one service boundary.
- Unauthorized requests return explicit 401 responses instead of silent fallback behavior.

## AI Usage

AI assistance was used for:

- identifying raw forecast variables for each activity and the initial ideal-weather heuristics,
- understanding Open-Meteo variable semantics from the official weather and geocoding documentation,
- pressure-testing comfort thresholds and ranking weights,
- evaluating whether direct daily API queries would be sufficient versus hourly-to-daily aggregation,
- reconstructing the monorepo setup flow into a repeatable project scaffold,
- drafting repository documentation and smoke-test checklists,
- adapting the Venture HTML theme into a Nuxt implementation.

## Risks

- Daily ranking is easier to present and cache, but it is less precise than a purely hourly experience.
- Hourly conditions can diverge sharply within a day, so confidence metadata is used to surface that uncertainty.
- Surfing accuracy depends on curated coastal configuration. Outside supported regions the score is still available, but confidence is intentionally degraded.

## REST and GraphQL examples

REST:

```bash
curl -H "XApiKey: public-dev-key" \
  "http://localhost:3000/locations/-33.9249/18.4241/rank-activities"
```

REST by name:

```bash
curl -H "XApiKey: public-dev-key" \
  "http://localhost:3000/locations/by-name/Cape%20Town/rank-activities"
```

GraphQL:

```bash
curl -X POST "http://localhost:3000/graphql" \
  -H "Content-Type: application/json" \
  -H "XApiKey: public-dev-key" \
  --data '{"query":"query ($input: CoordinatesInput!) { rankActivitiesByCoordinates(input: $input) { location { name } days { date activities { activity score confidence reasons } } } }","variables":{"input":{"latitude":-33.9249,"longitude":18.4241}}}'
```

Frontend proxy examples:

```bash
curl "http://localhost:3001/api/locations/search?query=Cape%20Town&transport=graphql"
curl "http://localhost:3001/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest"
curl "http://localhost:3002/api/locations/search?query=Cape%20Town&transport=rest"
curl "http://localhost:3002/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql"
```
