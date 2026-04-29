# @activity-ranker/fe

Nuxt frontend for the Venture activity forecast UI.

## Commands

- `yarn dev` - starts the local Nuxt application.
- `yarn build` - builds the production bundle.
- `yarn test:ci` - builds shared contracts and runs the port-free Vitest suites.
- `yarn test:e2e` - starts the built Nuxt app for Playwright and runs browser e2e coverage.
- `yarn test:fe:ui` - opt-in Vitest UI workflow for local debugging only.
- `yarn typecheck` - Nuxt type checking.

## First run

- Preferred: from the repo root run `docker compose up --build`, then open `http://localhost:3001`.
- Fallback: run `yarn dev` from `packages/fe` and let the default proxy target `http://localhost:3000`.
- If you are resuming from an older Docker state, clear volumes once with `docker compose down --volumes --remove-orphans` before restarting.

## Local runtime notes

- The frontend expects the backend at `http://localhost:3000` by default.
- `NUXT_API_INTERNAL_KEY` defaults to `internal-dev-key` for local development, including the Docker quickstart.
- Override `NUXT_API_BASE_URL` if the backend runs on a different host or port.
- Browser requests stay same-origin and flow through Nuxt server routes under `/api/locations/*`.
- `transport=rest` and `transport=graphql` are both supported on the Nuxt proxy routes.
- Prefer `headerNames.xInternalKey` when constructing backend auth headers from `@activity-ranker/shared`.

## UX expectations

- City or town autocomplete after three characters.
- One selected location at a time.
- User-visible `REST` / `GraphQL` transport switch.
- Theme persistence without cookies.

## Proxy examples

```bash
curl "http://localhost:3001/api/locations/search?query=Cape%20Town&transport=rest"
curl "http://localhost:3001/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql"
```
