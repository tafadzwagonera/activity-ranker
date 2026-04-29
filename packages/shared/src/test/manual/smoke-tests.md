# Shared workspace manual smoke tests

1. Run `yarn workspace @activity-ranker/shared build` and confirm `dist/` is created without type errors.
2. Run `yarn workspace @activity-ranker/shared test:ci` and confirm the shared schema tests pass.
3. Confirm both `packages/be` and `packages/fe` still import `@activity-ranker/shared` successfully after the shared build.
4. Run `rg -n "export const [A-Z][A-Z0-9_]*\\s*=" packages/shared/src/contracts.ts packages/be/src/integrations/weather/open-meteo.config.ts packages/be/src/integrations/weather/weather.constants.ts` and confirm only the NestJS DI tokens in `packages/be/src/integrations/weather/weather.constants.ts` remain uppercase by design.
5. Validate one example ranking response against the shared `{ location, days }` contract shape before shipping API changes.
