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

## Styling

### CSS variables and Tailwind

CSS custom properties in `app/assets/css/main.css` are the source of truth for all
design tokens (colours, shadows, radii). Tailwind extends its theme with
`var(--token)` references so utilities like `text-gold` and `bg-sky` resolve through
those properties at runtime. Dark mode is handled entirely by the
`[data-theme="dark"]` selector set on `<html>`; Tailwind's `dark:` variant is not used.

### Custom CSS hooks

Some class names are intentionally kept as CSS hooks rather than replaced by Tailwind:

| Class          | Purpose                                                                       |
| -------------- | ----------------------------------------------------------------------------- |
| `is-active`    | Highlights the selected transport button                                      |
| `is-error`     | Colours error status messages with `--danger`                                 |
| `search-input` | Targets the `:focus` ring that cannot be expressed as a Tailwind utility      |
| `activity-row` | Targeted by the `max-width: 720 px` responsive override                       |
| `loading-card` | Required by the DOM unit test (`packages/fe/test/index-page.dom.spec.ts:214`) |

### Setup

`@nuxtjs/tailwindcss` is the Tailwind integration. `@nuxt/ui` is installed as a
dependency but is **not activated** to avoid conflicts with the existing CSS-variable
design system.

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
