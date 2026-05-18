# @activity-ranker/be

NestJS backend for activity ranking.

## Commands

- `yarn build` - compiles NestJS and packages the Serverless deployment bundle.
- `yarn dev` - runs the Nest HTTP server with the public API on port `3000`.
- `PORT=3000 yarn start` - runs the built Nest app directly on port `3000`.
- `yarn test:ci` - builds shared contracts and runs backend Jest tests.
- `yarn workspace @activity-ranker/fe test:e2e` - from the repo root, runs the browser flow against the built frontend while this package serves the API.
- `yarn typecheck` - TypeScript validation.

## First run

- Preferred: from the repo root run `docker compose up --build`, then use `http://localhost:3000/health`.
- Fallback: run `PORT=3000 yarn dev` from `packages/be` when you only want the backend outside Docker.

## Local runtime notes

- The backend entrypoint lives in `src/main.ts` for direct Nest startup, and `src/lambda.ts` contains the Lambda bridge for deployment.
- Direct backend startup loads `.env` and `.env.local` from the repo root and `packages/be`, then preserves any shell-provided environment variables over file values.
- `yarn dev` starts the Nest HTTP server directly, so `PORT` controls the public HTTP port.
- `yarn start` runs the built Nest app directly, so `PORT` controls that listener.
- Direct local startup defaults `API_KEY_PUBLIC_VALUES` to `public-dev-key` and `API_KEY_INTERNAL_VALUES` to `internal-dev-key` unless you override them.
- The local health check is `http://localhost:3000/health` by default.
- Authenticated routes accept either `XApiKey` or `XInternalKey`.
- Prefer `headerNames.xApiKey` and `headerNames.xInternalKey` when importing backend auth header names from `@activity-ranker/shared`.

## Public endpoints

- `GET /health`
- `GET /locations/search?query=<name>`
- `GET /locations/{latitude}/{longitude}/rank-activities`
- `GET /locations/by-name/{name}/rank-activities`
- `POST /graphql`

## Response contract

- Ranking responses use the shared `{ location, days }` contract exported from `@activity-ranker/shared`.
- The first item in `days` is the current day when forecast data is available.
- `GET /locations/by-name/{name}/rank-activities` enriches `location` with `country` and `admin1` when Open-Meteo geocoding returns them.
