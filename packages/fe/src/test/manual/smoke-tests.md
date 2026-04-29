# Frontend manual smoke tests

## Setup

1. Start the full stack with `docker compose up --build` or run `yarn dev:be` and `yarn dev:fe`.
2. Open `http://localhost:3001` and confirm the Venture page, transport toggle, and search input render.

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
