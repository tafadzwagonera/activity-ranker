# Frontend manual smoke tests

## Setup

1. Start the full stack with `docker compose up --build` or run `API_KEY_PUBLIC_VALUES=public-dev-key API_KEY_INTERNAL_VALUES=internal-dev-key yarn dev:be` and `yarn dev:fe`.
2. Open `http://localhost:3001` and confirm the Venture page, transport toggle, and search input render.

## Startup and reachability

1. Run `curl -I http://127.0.0.1:3001` and confirm the response is `200 OK`.
2. Reload the page and confirm Nuxt does not log a CSS import resolution error for `~/assets/css/main.css`.
3. Confirm the landing page renders without a blank screen or server error overlay.

## Search and selection

1. Type at least three characters and confirm autocomplete suggestions appear.
2. Select one suggestion and confirm rankings render.
3. Try selecting a second city without clearing the first and confirm the single-location error appears.

## Transport and state persistence

1. Switch from `REST` to `GraphQL` and confirm rankings reload.
2. Toggle the theme and refresh the page; confirm the theme persists.

## Error and loading states

1. Slow or block the rankings request in devtools and confirm the loading skeleton appears.
2. Trigger a bad `NUXT_API_INTERNAL_KEY` or failing proxy response and confirm the UI shows an error state instead of hanging.

## Proxy observability

1. Run `curl -i -H "x-request-id: smoke-fe-search-123" "http://localhost:3001/api/locations/search?query=Cape%20Town&transport=rest"` and confirm the response includes `x-request-id: smoke-fe-search-123`.
2. Run `curl -i -H "x-request-id: smoke-fe-rank-123" "http://localhost:3001/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql"` and confirm the response includes `x-request-id: smoke-fe-rank-123`.
3. Stop the backend or point `NUXT_API_BASE_URL` at an unused port, then rerun the rankings request and confirm the response is `502` and includes the matching `requestId`. In `nuxt dev`, H3 may still include a development stack; verify the public `message` remains generic and no credentials are leaked.
4. Inspect both the Nuxt server logs and backend logs and confirm the same request ID appears across the proxy and backend structured log lines for successful requests.
