# Backend manual smoke tests

## Setup

1. Start the backend with `API_KEY_PUBLIC_VALUES=public-dev-key API_KEY_INTERNAL_VALUES=internal-dev-key PORT=3000 yarn workspace @activity-ranker/be dev` or start the full stack with `docker compose up --build`.
2. Confirm `curl http://localhost:3000/health` returns `200`.
3. Build the backend with `yarn workspace @activity-ranker/be build`, run `API_KEY_PUBLIC_VALUES=public-dev-key API_KEY_INTERNAL_VALUES=internal-dev-key PORT=4000 yarn workspace @activity-ranker/be start` in a second shell, then confirm `curl http://localhost:4000/health` returns `200`.

## Docker startup regression

1. Run `docker compose up --build -d`.
2. Confirm `docker compose ps` shows the `be` service as `healthy`.
3. Confirm `docker compose logs be` does not mention `serverless offline` or an internal lambda bridge port.
4. Confirm `curl http://localhost:3000/health` returns `200` after the Docker startup path.
5. If startup still looks stale, run `docker compose down --volumes --remove-orphans` once and start again. The current Dockerfile handles dependency installation during image build, so a separate runtime `deps` service should no longer be part of the happy path.

## Auth coverage

1. Run `curl "http://localhost:3000/locations/search?query=Cape"` with no auth header and expect `401`.
2. Run `curl -H "XApiKey: public-dev-key" "http://localhost:3000/locations/search?query=Cape"` and expect suggestions.
3. Run `curl -H "XInternalKey: internal-dev-key" "http://localhost:3000/locations/search?query=Cape"` and expect the same suggestions.
4. POST `rankActivitiesByCoordinates` to `/graphql` with `XApiKey: public-dev-key` and expect a `200` ranking payload.
5. POST `rankActivitiesByCoordinates` to `/graphql` with `XInternalKey: internal-dev-key` and expect the same shape.

## Ranking behavior

1. Run `curl -H "XApiKey: public-dev-key" "http://localhost:3000/locations/-33.9249/18.4241/rank-activities"` and confirm the first item in `days` is today.
2. Run `curl -H "XApiKey: public-dev-key" "http://localhost:3000/locations/by-name/Cape%20Town/rank-activities"` and confirm the response `location` includes `name`, `country`, and `admin1`.
3. Run `curl -H "XApiKey: public-dev-key" "http://localhost:3000/locations/181/18.4241/rank-activities"` and expect `400`.

## Observability correlation

1. Run `curl -i -H "x-request-id: smoke-rest-123" http://localhost:3000/health` and confirm the response includes `x-request-id: smoke-rest-123`.
2. Run `curl -i -H "XApiKey: public-dev-key" -H "x-request-id: smoke-rank-123" "http://localhost:3000/locations/-33.9249/18.4241/rank-activities"` and confirm the response includes `x-request-id: smoke-rank-123`.
3. POST to `/graphql` with `XInternalKey: internal-dev-key` and `x-request-id: smoke-graphql-123`, then confirm the response includes `x-request-id: smoke-graphql-123`.
4. Inspect the backend terminal logs and confirm the matching request IDs appear in structured JSON log lines with `backend_request_completed` or `backend_request_failed`.
