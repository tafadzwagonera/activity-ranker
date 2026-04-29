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

### Observability boundaries

Observability correlation is server-boundary based. The browser calls same-origin `/api/locations/*`, and correlation starts when the frontend server boundary receives that request. From there, the same `x-request-id` is carried through the frontend proxy and into Nest so the request can be followed without relying on browser logs.

The active boundaries are:

- Nuxt server routes in `packages/fe/server/api/locations/*`
- Next route handlers in `packages/next/app/api/locations/*`
- Nest middleware in `RequestObservabilityMiddleware`

The backend is the final authority for request completion because it sets its own response header and writes its structured log on `response.finish`. The frontend proxy is the caller-facing authority because it validates input, decides REST vs GraphQL transport, returns the public error envelope, and logs proxy success or failure with the same `requestId`.

### Request Lifecycle

One request follows this generalized flow:

1. The browser calls `/api/locations/search` or `/api/locations/rank-activities` with optional `x-request-id`.
2. The frontend boundary validates query params and transport:
   - Nuxt uses `defineEventHandler(...)`.
   - Next uses a route handler returned by `createSearchRouteHandler(...)` or `createRankActivitiesRouteHandler(...)`.
3. `createProxyRequestContext(...)` resolves correlation state:
   - if the inbound `x-request-id` header is a non-empty string, it is reused;
   - otherwise a new UUID is generated.
4. The frontend boundary exposes that request ID back to the caller:
   - Nuxt sets the proxy response header immediately inside `setProxyResponseRequestId(...)`;
   - Next stores the same `requestId` in `ProxyRequestContext` immediately, then writes `x-request-id` when it constructs the final `Response`.
5. The frontend backend client calls `buildBackendHeaders(...)`, adding both `XInternalKey` and the resolved `x-request-id`.
6. Nest receives the upstream call. `RequestObservabilityMiddleware` reads the incoming `x-request-id` if present, otherwise generates one, stores `request.requestId` and `request.startTimeInMs`, sets the backend response header, and waits for `response.finish`.
7. The controller or resolver completes the REST or GraphQL work. When the response finishes, Nest emits either `backend_request_completed` or `backend_request_failed`.
8. Control returns to the frontend proxy. The proxy logs either `frontend_proxy_request_completed` or `frontend_proxy_request_failed`, and the caller receives either the success payload or a public error body containing the same `requestId`.

Short framework deltas:

- Nuxt keeps correlation state on `ProxyRequestContext` derived from `H3Event`.
- Next keeps correlation state on `ProxyRequestContext` derived from the standard `Request`.
- Nest keeps correlation state on the Express request object as `request.requestId` and `request.startTimeInMs`.

### Call Stack

Nuxt search request path:

```text
Browser
└── GET /api/locations/search?query=Cape%20Town&transport=rest
    └── createSearchHandler(...)
        └── defineEventHandler(async (event) => ...)
            ├── createProxyRequestContext({ event, operation: "searchLocations", transport })
            │   ├── resolveProxyRequestId(event)
            │   └── setProxyResponseRequestId(event, requestId)
            ├── fetchBackendSearchResults(...)
            │   ├── buildBackendHeaders(internalKey, requestId)
            │   └── buildBackendSearchRequest(...)
            │       └── GET /locations/search?query=Cape%20Town
            └── logProxyRequestCompleted(...) or logProxyRequestFailed(...)
```

Next rankings request path:

```text
Browser
└── GET /api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql
    └── createRankActivitiesRouteHandler(...)
        └── async (request: Request) => ...
            ├── createProxyRequestContext({ operation: "rankActivities", request, transport })
            │   └── resolveProxyRequestId(request)
            ├── fetchBackendRankings(...)
            │   ├── buildBackendHeaders(internalKey, requestId)
            │   └── buildBackendRankingsRequest(...)
            │       └── POST /graphql
            ├── Response.json(..., { headers: { "x-request-id": requestId } })
            └── logProxyRequestCompleted(...) or logProxyRequestFailed(...)
```

Backend middleware path:

```text
Incoming HTTP request
└── RequestObservabilityMiddleware.use(request, response, next)
    ├── resolveRequestId(request)
    ├── request.requestId = requestId
    ├── request.startTimeInMs = Date.now()
    ├── response.setHeader("x-request-id", requestId)
    ├── next()
    │   ├── ApiKeyGuard.canActivate(...)
    │   └── REST controller or GraphQL resolver
    └── response.on("finish", ...)
        ├── createRequestLog(...)
        └── backendLogger.info(...) | warn(...) | error(...)
```

REST vs GraphQL inside Nest:

```text
REST
├── LocationsController.searchLocations(...)
└── LocationsController.rankActivities(...)

GraphQL
├── LocationsResolver.searchLocations(...)
└── LocationsResolver.rankActivitiesByCoordinates(...)
```

### Program State

Frontend proxy context in both frameworks:

```ts
type ProxyRequestContext = {
  method: "GET";
  operation: "searchLocations" | "rankActivities";
  path: "/api/locations/search" | "/api/locations/rank-activities";
  requestId: "0d7d5d4d-...";
  startTimeInMs: 1760000000000;
  transport: "rest" | "graphql" | "unknown";
};
```

Nuxt note: that object is built from `H3Event` and Nuxt also mutates the outgoing response header at creation time. Next note: that object is built from `Request`; the request ID sits in memory until the handler returns a `Response`.

Backend request headers built by `buildBackendHeaders(...)`:

```ts
{
  XInternalKey: "internal-dev-key",
  "x-request-id": "0d7d5d4d-..."
}
```

Shared structured log shape written by both boundaries:

```ts
type RequestLog = {
  durationInMs: 42;
  event: "frontend_proxy_request_completed";
  method: "GET";
  operation: "searchLocations";
  outcome: "success";
  path: "/api/locations/search";
  requestId: "0d7d5d4d-...";
  statusCode: 200;
  transport: "rest";
};
```

Backend request extension state stored by `RequestObservabilityMiddleware`:

```ts
type ObservabilityRequest = Request & {
  requestId: "0d7d5d4d-...";
  startTimeInMs: 1760000000000;
};
```

What changes at each boundary:

- Frontend proxy stores stable request metadata once in `ProxyRequestContext`.
- Backend client turns that state into outbound auth and correlation headers.
- Nest stores correlation and timing state on the Express request object until `response.finish`.
- Logs derive `durationInMs`, `statusCode`, `event`, and `outcome` at the moment the boundary knows the final result.

### Failure Behavior

Validation failures are handled at the proxy boundary before any backend call:

- invalid Nuxt or Next search query logs `frontend_proxy_request_failed` with `outcome: "validation_failed"` and returns `400`
- invalid coordinates logs `frontend_proxy_request_failed` with `outcome: "validation_failed"` and returns `400`
- invalid transport logs `frontend_proxy_request_failed` with `outcome: "validation_failed"` and returns `400`

Proxy configuration failures are also handled at the frontend boundary:

- missing `apiBaseUrl` or internal key logs `frontend_proxy_request_failed` with `outcome: "proxy_misconfigured"` and returns `500`

Upstream exceptions are normalized by the frontend boundary:

- any thrown backend fetch error logs `frontend_proxy_request_failed` with `outcome: "upstream_failed"` and returns `502`

Caller-visible error shapes differ slightly by framework:

- Next returns a minimal JSON body from `createErrorResponse(...)`:

```json
{
  "message": "Backend request failed.",
  "requestId": "0d7d5d4d-..."
}
```

- Nuxt throws `createRequestError(...)`, which currently stores the correlation ID in `data.requestId`:

```json
{
  "statusMessage": "Backend request failed.",
  "data": {
    "requestId": "0d7d5d4d-..."
  }
}
```

Nuxt caveat: in `nuxt dev`, H3 may still wrap that with extra development debugging fields. The current code guarantees `requestId` in `data`; it does not guarantee a fully sanitized envelope beyond that.

Backend auth failures preserve correlation:

- the proxy still sends `x-request-id` upstream
- Nest middleware still stores `request.requestId` and sets the backend response header before auth completes
- `ApiKeyGuard` can throw `UnauthorizedException`
- the finished backend response still emits `backend_request_failed` with the same `requestId`

Success payloads preserve the same correlation ID too:

- REST callers receive the normal REST payload plus `x-request-id`
- GraphQL callers receive the GraphQL payload plus `x-request-id`
- frontend proxy callers receive the proxy success payload plus `x-request-id`

### Log Contract and Metrics

The active shared request log contract is `RequestLog` in `@activity-ranker/shared`. The fields that matter for correlation and log-derived metrics are:

- `requestId`
- `event`
- `method`
- `path`
- `operation`
- `statusCode`
- `durationInMs`
- `transport`
- `outcome`

The currently active lifecycle events are:

- `frontend_proxy_request_completed`
- `frontend_proxy_request_failed`
- `backend_request_completed`
- `backend_request_failed`

Severity is derived from status code:

- `info` for success
- `warn` for `4xx`
- `error` for `5xx`

Metrics are intended to be derived from those logs rather than introduced as separate custom instrumentation first. That keeps request count, latency, client-error rate, server-error rate, and boundary-specific outcomes queryable from one contract instead of splitting correlation logic across logs and hand-built counters.

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
