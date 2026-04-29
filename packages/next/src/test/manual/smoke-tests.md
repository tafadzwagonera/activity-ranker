# Next manual smoke tests

1. Start the backend with `PORT=3000 yarn dev:be`.
2. Start the Next app with `NEXT_API_INTERNAL_KEY=internal-dev-key yarn dev:next`.
3. Open `http://localhost:3002` and confirm the Venture heading, transport toggle, and search input render.
4. Type at least three characters for a city or town and confirm suggestions appear.
5. Select one suggestion and confirm rankings load.
6. Try selecting a different city without clearing the current one and confirm the UI shows the single-location error.
7. Switch from `REST` to `GraphQL` and confirm rankings reload without leaving the page.
8. Toggle the theme and confirm the visual theme persists after refresh.
9. Trigger a bad `NEXT_API_INTERNAL_KEY` locally and confirm the UI shows an error state instead of hanging.
