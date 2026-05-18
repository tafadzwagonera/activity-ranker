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
cd /(Users|home)/<username>/path/to/activity-ranker
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
cd /(Users|home)/<username>/path/to/activity-ranker
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use
corepack enable
corepack prepare yarn@1.22.22 --activate
yarn install --non-interactive
yarn lefthook install
```

If `yarn install` prints repeated `There appears to be trouble with your network connection. Retrying...` lines, the most likely cause is a broken IPv6 path to `registry.yarnpkg.com`. Yarn Classic can hit the IPv6 address first and keep retrying even when IPv4 works. Force IPv4-first DNS resolution for the install:

```bash
NODE_OPTIONS=--dns-result-order=ipv4first yarn install --non-interactive
```

If that fixes it, add this to your shell profile before rerunning the normal setup flow:

```bash
export NODE_OPTIONS="--dns-result-order=ipv4first"
```

Quick verification commands:

```bash
node -p "require('node:dns').getDefaultResultOrder()"
node -e "const https=require('https'); const opts={hostname:'registry.yarnpkg.com',family:6,path:'/'}; https.get(opts,res=>{console.log('ipv6 status',res.statusCode); res.resume();}).on('error',e=>console.error('ipv6 failed',e.code,e.message))"
node -e "const https=require('https'); const opts={hostname:'registry.yarnpkg.com',family:4,path:'/'}; https.get(opts,res=>{console.log('ipv4 status',res.statusCode); res.resume();}).on('error',e=>console.error('ipv4 failed',e.code,e.message))"
```

## Local ports and invocation patterns

- `yarn dev:be` runs the Nest HTTP server directly, not `serverless offline`.
- The backend HTTP entrypoint defaults to `http://localhost:3000`.
- Use `PORT=3000 yarn dev:be` to override the backend HTTP port for local development.
- Use `PORT=3000 yarn workspace @activity-ranker/be start` only when running the built Nest app directly.
- Direct backend startup loads `.env` and `.env.local` from the repo root and `packages/be`, then preserves shell-provided environment variables over file values.
- `NUXT_API_BASE_URL` only needs to be set when the frontend should target a non-default backend host or port.
- `NUXT_API_INTERNAL_KEY` is optional for local development because the frontend defaults to `internal-dev-key`.
- Nuxt startup loads `.env` and `.env.local` from the repo root and `packages/fe`, then preserves shell-provided environment variables over file values.
- `NEXT_API_BASE_URL` only needs to be set when the Next.js mirror should target a non-default backend host or port.
- `NEXT_API_INTERNAL_KEY` is optional for local development because the Next.js mirror defaults to `internal-dev-key`.
- Next startup loads `.env` and `.env.local` from the repo root and `packages/next`, then preserves shell-provided environment variables over file values.
- `docker compose up --build -d` publishes the Next.js mirror on `http://localhost:3002`, the Nuxt app on `http://localhost:3001`, and wires both server-side proxies to `http://be:3000`.
- The compose stack no longer depends on a runtime `deps` service; if you are resuming from an older dirty stack, clear volumes with `docker compose down --volumes --remove-orphans` before restarting.

## Frontend dependency notes

- `@activity-ranker/fe` stays on Tailwind CSS `3.4.x` because it uses the Nuxt Tailwind module path.
- `@activity-ranker/next` uses Tailwind CSS `4.2.x` with `@tailwindcss/postcss`.
- The root workspace uses Yarn `nohoist` rules so each frontend keeps its own Tailwind major version instead of sharing one hoisted install.
- The root `tailwindcss` dependency remains on `3.4.x` so Nuxt type generation and the Nuxt Tailwind module can still resolve the package from the workspace root.

## Observability and metrics

### Observability boundaries

Observability correlation is server-boundary based. The browser calls same-origin `/api/locations/*`, and correlation starts when the frontend server boundary receives that request. From there, the same `x-request-id` is carried through the frontend proxy and into Nest so the request can be followed without relying on browser logs.

The active boundaries are:

- Nuxt server routes in `packages/fe/server/api/locations/*`
- Next route handlers in `packages/next/app/api/locations/*`
- Nest middleware in `RequestObservabilityMiddleware`

The backend is the final authority for request completion because it sets its own response header and writes its structured log on `response.finish`. The frontend proxy is the caller-facing authority because it validates input, decides REST vs GraphQL transport, returns the public error envelope, and logs proxy success or failure with the same `requestId`.

### Request lifecycle

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

### Call stack

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

### Program state

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

### Failure behavior

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

### Log contract and metrics

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

## Testing infrastructure and implementation

The test strategy follows the same transport and boundary split as the production code:

- `@activity-ranker/shared` uses Vitest to keep schemas, headers, exports, and repository invariants stable for every consumer.
- `@activity-ranker/be` uses Jest for Nest unit, integration-style, bootstrap, lambda, and e2e coverage.
- `@activity-ranker/fe` uses Vitest for Nuxt server handlers, Vue composables, DOM rendering, and request utilities, plus Playwright for browser journeys.
- `@activity-ranker/next` uses Vitest for App Router route handlers, server helpers, browser request builders, and runtime config behavior.

### Test command flow

```text
yarn test
  └── yarn test:ci
      └── yarn workspaces run test:ci
          ├── @activity-ranker/shared -> vitest run --coverage
          ├── @activity-ranker/be     -> yarn --cwd ../shared build && jest --coverage --runInBand
          ├── @activity-ranker/fe     -> yarn --cwd ../shared build && vitest run --coverage
          └── @activity-ranker/next   -> yarn --cwd ../shared build && vitest run --coverage
```

Coverage merging is a separate repo-level pass:

```text
yarn coverage:report
  ├── yarn clean:coverage
  ├── rerun shared, be, fe, and next coverage jobs
  └── node ./scripts/merge-coverage.mjs
      ├── merge packages/shared/coverage/coverage-final.json
      ├── merge packages/be/coverage/coverage-final.json
      ├── merge packages/fe/coverage/coverage-final.json
      └── write root coverage reports
```

Current caveat: `scripts/merge-coverage.mjs` currently omits `packages/next/coverage/coverage-final.json`, so the root merged report does not yet include Next coverage even though the root command executes the Next suite.

### What each suite proves

- Shared contract tests prove frontend and backend code agree on `coordinatesSchema`, `transportModeSchema`, `rankedActivitiesResponseSchema`, and `headerNames`.
- Backend unit tests isolate domain behavior in `LocationsService`, `LocationsController`, `LocationsResolver`, auth, validation, and weather-ranking helpers with mocks.
- Backend e2e tests boot `AppModule`, override external providers, and exercise real REST and GraphQL HTTP paths through `supertest`.
- Nuxt node-side tests execute real H3 handlers with synthetic events to verify validation, config handling, upstream proxying, correlation headers, and structured logs.
- Nuxt DOM tests mount real Vue code in `happy-dom` to verify reactive state and rendered output without a browser.
- Nuxt Playwright tests verify the user journey end-to-end at the browser boundary by intercepting `/api/locations/*`.
- Next tests stay server-first: route handlers receive real `Request` objects, and helper tests assert the exact outbound payloads and public response envelopes.

### Call stacks

Shared schema validation:

```text
## Call Stack: rankedActivitiesResponseSchema.parse(payload)
rankedActivitiesResponseSchema.parse(payload)
  └── Zod validation pipeline
      ├── validate location fields
      ├── validate each day entry
      └── validate each activity score/confidence/reasons tuple
```

Nuxt browser-to-backend request path:

```text
## Call Stack: useLocationSearch("Cape Town")
useLocationSearch(selectedTransport)
  └── watch([query, transport], ...)
      └── useDebounceFn(async search, 350)
          └── fetchSearchResults({ query: "Cape Town", transport: "rest" })
              └── GET /api/locations/search?query=Cape%20Town&transport=rest
                  └── createSearchHandler(...)
                      └── defineEventHandler(async (event) => ...)
                          ├── createProxyRequestContext({ event, operation: "searchLocations", transport })
                          ├── fetchBackendSearchResults(...)
                          │   ├── buildBackendHeaders(internalKey, requestId)
                          │   └── buildBackendSearchRequest(...)
                          └── logProxyRequestCompleted(...) or logProxyRequestFailed(...)
```

Next App Router request path:

```text
## Call Stack: createRankActivitiesRouteHandler(request)
createRankActivitiesRouteHandler(...)
  └── async (request: Request) => ...
      ├── coordinatesSchema.safeParse(...)
      ├── createProxyRequestContext({ operation: "rankActivities", request, transport })
      ├── fetchBackendRankings(...)
      │   ├── buildBackendHeaders(internalKey, requestId)
      │   └── buildBackendRankingsRequest(...)
      ├── Response.json(rankings, { headers: { "x-request-id": requestId } })
      └── logProxyRequestCompleted(...) or logProxyRequestFailed(...)
```

Nest backend e2e path:

```text
## Call Stack: request(server).get("/locations/.../rank-activities")
request(server)
  └── AppModule
      ├── RequestObservabilityMiddleware.use(request, response, next)
      │   ├── request.requestId = resolveRequestId(request)
      │   ├── request.startTimeInMs = Date.now()
      │   ├── response.setHeader("x-request-id", requestId)
      │   └── next()
      │       ├── ApiKeyGuard.canActivate(...)
      │       └── REST controller or GraphQL resolver
      │           ├── LocationsController.rankActivities(...)
      │           │   └── parseCoordinates(...)
      │           │       └── LocationsService.rankActivitiesByCoordinates(...)
      │           └── LocationsResolver.rankActivitiesByCoordinates(...)
      │               └── coordinatesSchema.parse(input)
      │                   └── LocationsService.rankActivitiesByCoordinates(...)
      └── response.on("finish", ...)
          └── backendLogger.info(...) or backendLogger.error(...)
```

### Program state

Nuxt search composable state:

```json
useLocationSearch {
  error: RefImpl {
    _value: null
  },
  loading: RefImpl {
    _value: false
  },
  query: RefImpl {
    _value: "Cape Town"
  },
  results: RefImpl {
    _value: [
      {
        id: 1,
        name: "Cape Town",
        latitude: -33.9249,
        longitude: 18.4241,
        country: "South Africa",
        admin1: "Western Cape"
      }
    ]
  }
}
```

Nuxt rankings composable after a failed fetch:

```json
useActivityRankings {
  data: RefImpl {
    _value: null
  },
  error: RefImpl {
    _value: "Unable to load activity rankings."
  },
  loading: RefImpl {
    _value: false
  }
}
```

Proxy request context in both frontends:

```json
ProxyRequestContext {
  method: "GET",
  operation: "searchLocations" | "rankActivities",
  path: "/api/locations/search" | "/api/locations/rank-activities",
  requestId: "request-123",
  startTimeInMs: 1760000000000,
  transport: "rest" | "graphql" | "unknown"
}
```

Backend middleware state after correlation is attached:

```json
ObservabilityRequest {
  method: "GET" | "POST",
  originalUrl: "/graphql" | "/locations/-33.9249/18.4241/rank-activities",
  requestId: "request-123",
  startTimeInMs: 1760000000000,
  headers: {
    "x-api-key": "public-test-key",
    "x-internal-key": "internal-test-key",
    "x-request-id": "request-123"
  }
}
```

Backend service state in unit tests:

```json
LocationsService {
  weatherProvider: {
    rankActivitiesByCoordinates: mockFn()
  },
  geocodingProvider: {
    searchLocations: mockFn()
  }
}
```

### Data flow under test

- Browser-side state starts in Vue refs such as `query`, `results`, `selectedTransport`, `data`, `error`, and `loading`.
- The browser never talks to Nest directly. It always builds same-origin `/api/locations/*` requests first.
- The Nuxt or Next server boundary validates the request, resolves `requestId`, chooses REST vs GraphQL, injects `XInternalKey`, and forwards the upstream request.
- Nest middleware stores `requestId` and timing state before auth and controller or resolver execution continue.
- Controllers and resolvers normalize input, then delegate to `LocationsService`, which delegates to mocked or real geocoding and weather providers.
- Tests assert the state at the point where each layer owns correctness: refs in composable and DOM tests, proxy envelopes in frontend handler tests, and headers plus payload shape in backend e2e tests.

## Rank scoring algorithm nuances

The ranking flow starts with coordinates and ends with a sorted daily list of `ActivityScore` objects:

1. `surfSpots` in `packages/be/src/integrations/weather/surf-spots.config.ts` defines the curated coastal metadata used only for surfing.
2. `SurfSpotsService.resolveNearestSpot(...)` converts the incoming latitude and longitude into a nearest configured `SurfSpot | undefined`, using a 25 km cutoff.
3. `OpenMeteoProvider.rankActivitiesByCoordinates(...)` fetches forecast and marine hourly arrays from Open-Meteo, groups them into `DailyForecast[]`, builds the location object, and passes all of that into `rankingService.rankForecast(...)`.
4. `RankingService.rankForecast(...)` sorts days, then ranks every supported activity for each day by calling `rankActivity(...)`.
5. `rankActivity(...)` scores every hour through `scoreHourForActivity(...)`, averages those hourly scores into the final daily `score`, measures volatility with `standardDeviation(...)`, and derives `confidence`.
6. `scoreHourForActivity(...)` selects the weather rules for each activity. Surfing is the most nuanced path because it combines wave height, period, direction, wind, and temperature, and it changes behavior when no nearby configured surf spot is available.
7. Helper functions such as `weightedScore(...)`, `rangeScore(...)`, `minScore(...)`, `maxScore(...)`, and `angleScore(...)` turn raw measurements into normalized `0..1` score parts before the final daily ranking is sorted descending.

Rank-scoring call path:

```text
surfSpots
└── SurfSpotsService.resolveNearestSpot(latitude, longitude)
    ├── surfSpots.map(...)
    │   └── distanceInKm(...)
    │       └── toRadians(...)
    ├── .filter(({ distance }) => distance <= 25)
    └── .sort(...)[0]?.spot

OpenMeteoProvider.rankActivitiesByCoordinates(latitude, longitude)
├── fetch(forecastUrl)
├── fetch(marineUrl)
├── groupHourlyForecasts(forecast, marine)
│   └── DailyForecast[]
└── rankingService.rankForecast({
    dailyForecasts,
    location,
    surfSpot
  })
```

```text
RankingService.rankForecast(input)
├── input.dailyForecasts
│   └── .sort((left, right) => left.date.localeCompare(right.date))
└── activityIds.map((activity) => rankActivity(activity, day.hourly, input.surfSpot))
    └── RankingService.rankActivity(activity, hourlyForecasts, surfSpot)
        ├── hourlyForecasts.map((hourly) => scoreHourForActivity(activity, hourly, surfSpot))
        ├── average(hourlyScores)
        ├── standardDeviation(hourlyScores)
        │   ├── average(values)
        │   └── average(values.map((value) => (value - mean) ** 2))
        ├── buildReasons(activity, hourlyForecasts, surfSpot)
        └── returns ActivityScore
```

```text
RankingService.scoreHourForActivity("surfing", hourly, surfSpot)
├── angleScore(hourly.waveDirection, surfSpot.idealWaveDirection, surfSpot.waveToleranceDegrees)
│   └── angleDifference(actual, ideal)
├── angleScore(hourly.windDirection10m, surfSpot.offshoreWindDirection, surfSpot.windToleranceDegrees)
│   └── angleDifference(actual, ideal)
├── weightedScore(parts, weights)
│   ├── rangeScore(hourly.temperature2m, [18, 30])
│   ├── rangeScore(hourly.waveHeight, [1, 3])
│   ├── minScore(hourly.wavePeriod, 8, 14)
│   ├── maxScore(hourly.windSpeed10m, 10, 24)
│   ├── waveDirectionScore
│   └── windDirectionScore
└── clamp(baseSurfingScore + 0.08) when surfSpot exists
```

Representative runtime state:

Configured surf spot entry:

```json
{
  "name": "Muizenberg",
  "latitude": -34.107,
  "longitude": 18.47,
  "idealWaveDirection": 180,
  "offshoreWindDirection": 315,
  "waveToleranceDegrees": 75,
  "windToleranceDegrees": 60
}
```

Resolved nearest spot for a Cape Town area request:

```json
{
  "surfSpot": {
    "name": "Muizenberg",
    "latitude": -34.107,
    "longitude": 18.47,
    "idealWaveDirection": 180,
    "offshoreWindDirection": 315,
    "waveToleranceDegrees": 75,
    "windToleranceDegrees": 60
  }
}
```

`RankingInput` assembled by `OpenMeteoProvider` before scoring:

```json
{
  "location": {
    "name": "-33.9249, 18.4241",
    "latitude": -33.9249,
    "longitude": 18.4241
  },
  "surfSpot": {
    "name": "Muizenberg",
    "latitude": -34.107,
    "longitude": 18.47,
    "idealWaveDirection": 180,
    "offshoreWindDirection": 315,
    "waveToleranceDegrees": 75,
    "windToleranceDegrees": 60
  },
  "dailyForecasts": [
    {
      "date": "2026-05-01",
      "hourly": [
        {
          "cloudCover": 30,
          "precipitation": 0.2,
          "snowfall": 0,
          "snowDepth": 0,
          "temperature2m": 22,
          "uvIndex": 5.8,
          "visibility": 14000,
          "waveDirection": 190,
          "waveHeight": 1.8,
          "wavePeriod": 11,
          "weatherCode": 2,
          "windDirection10m": 320,
          "windSpeed10m": 9
        }
      ]
    }
  ]
}
```

Representative per-hour surfing score parts after normalization:

```json
{
  "activity": "surfing",
  "hourly": {
    "temperature2m": 22,
    "waveDirection": 190,
    "waveHeight": 1.8,
    "wavePeriod": 11,
    "windDirection10m": 320,
    "windSpeed10m": 9
  },
  "parts": {
    "temperature2m": 1,
    "waveDirection": 0.87,
    "waveHeight": 1,
    "wavePeriod": 0.5,
    "windDirection10m": 0.92,
    "windSpeed10m": 1
  },
  "baseSurfingScore": 0.88,
  "surfSpotBonusApplied": true,
  "hourScore": 0.96
}
```

Final ranked activity entry returned to callers:

```json
{
  "activity": "surfing",
  "score": 0.82,
  "confidence": 0.9,
  "reasons": ["Matched nearby surf spot Muizenberg."]
}
```

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

## AI usage

AI assistance was used for:

- identifying raw forecast variables for each activity and the initial ideal-weather heuristics,
- understanding Open-Meteo variable semantics from the official weather and geocoding documentation,
- pressure-testing comfort thresholds and ranking weights,
- attempting to resolve the nuanced tradeoffs in the scoring algorithm,
- evaluating whether direct daily API queries would be sufficient versus hourly-to-daily aggregation,
- reconstructing the monorepo setup flow into a repeatable project scaffold,
- drafting repository documentation and smoke-test checklists,
- adapting the Venture HTML theme into a Nuxt implementation,
- converting BEM-based UI CSS into Tailwind CSS.

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
