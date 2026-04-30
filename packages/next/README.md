# @activity-ranker/next

Next.js mirror of the Venture activity forecast UI.

## Commands

- `yarn dev` - starts the local Next.js application on port `3002`.
- `yarn build` - builds the production bundle.
- `yarn start` - starts the built Next.js app on port `3002`.
- `yarn test:ci` - builds shared contracts and runs the port-free Vitest suites.
- `yarn typecheck` - TypeScript validation.
- `docker compose up --build -d` from the repo root starts this app on `http://localhost:3002`.

## Local runtime notes

- The Next app expects the backend at `http://localhost:3000` by default.
- Configure `NEXT_API_INTERNAL_KEY` for server-side proxy requests.
- Override `NEXT_API_BASE_URL` if the backend runs on a different host or port.
- Browser requests stay same-origin and flow through Next route handlers under `/api/locations/*`.
- `transport=rest` and `transport=graphql` are both supported on the Next proxy routes.
- If Docker startup looks stale after a previous runtime bootstrap experiment, run `docker compose down --volumes --remove-orphans` once before starting again.

## Styling

### CSS variables and Tailwind

CSS custom properties in `app/globals.css` are the source of truth for all design
tokens (colours, shadows, radii). Tailwind extends its theme with `var(--token)`
references so utilities like `text-gold` and `bg-sky` resolve through those properties
at runtime. Dark mode is handled entirely by the `:root[data-theme="dark"]` selector
set on `<html>`; Tailwind's `dark:` variant is not used.

### Custom CSS hooks

Some class names are intentionally kept as CSS hooks rather than replaced by Tailwind:

| Class                   | Purpose                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `is-active`             | Highlights the selected transport button                                 |
| `is-error`              | Colours error status messages with `--danger`                            |
| `search-input`          | Targets the `:focus` ring that cannot be expressed as a Tailwind utility |
| `activity-row`          | Targeted by the `max-width: 720 px` responsive override                  |
| `activity-row__metrics` | Targeted by the `max-width: 720 px` responsive override                  |

## UX expectations

- City or town autocomplete after three characters.
- One selected location at a time.
- User-visible `REST` / `GraphQL` transport switch.
- Theme persistence without cookies.
