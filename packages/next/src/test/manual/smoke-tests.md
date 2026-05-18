# Next manual smoke tests

1. Start the backend with `API_KEY_PUBLIC_VALUES=public-dev-key API_KEY_INTERNAL_VALUES=internal-dev-key PORT=3000 yarn dev:be`.
2. Start the Next app with `yarn dev:next`. Override `NEXT_API_INTERNAL_KEY` only if you want non-default local credentials.
3. Run `curl -I http://127.0.0.1:3002` and confirm the response is `200 OK`.
4. Open `http://localhost:3002` and confirm the Venture heading, transport toggle, and search input render.
5. Reload the page and confirm Next does not return a Tailwind or PostCSS startup error.
6. Type at least three characters for a city or town and confirm suggestions appear.
7. Select one suggestion and confirm rankings load.
8. Try selecting a different city without clearing the current one and confirm the UI shows the single-location error.
9. Switch from `REST` to `GraphQL` and confirm rankings reload without leaving the page.
10. Toggle the theme and confirm the visual theme persists after refresh.
11. Trigger a bad `NEXT_API_INTERNAL_KEY` locally and confirm the UI shows an error state instead of hanging.

## Proxy observability

1. Run `curl -i -H "x-request-id: smoke-next-search-123" "http://localhost:3002/api/locations/search?query=Cape%20Town&transport=rest"` and confirm the response includes `x-request-id: smoke-next-search-123`.
2. Run `curl -i -H "x-request-id: smoke-next-rank-123" "http://localhost:3002/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql"` and confirm the response includes `x-request-id: smoke-next-rank-123`.
3. Stop the backend or point `NEXT_API_BASE_URL` at an unused port, then rerun the rankings request and confirm the response is `502` with a minimal JSON body that includes `message` and `requestId` but no stack trace.
4. Inspect both the Next server logs and backend logs and confirm the same request ID appears across the proxy and backend structured log lines for successful requests.
