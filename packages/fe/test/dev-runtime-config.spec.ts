import { describe, expect, it } from "vitest";

import {
  DEFAULT_BACKEND_PORT,
  DEFAULT_FRONTEND_PORT,
  DEFAULT_INTERNAL_KEY,
  resolveFrontendRuntimeConfig,
} from "../utils/dev-runtime-config";

describe("dev runtime config", () => {
  it("uses localhost backend defaults for local development", () => {
    expect(resolveFrontendRuntimeConfig({})).toEqual({
      apiBaseUrl: `http://localhost:${DEFAULT_BACKEND_PORT}`,
      apiInternalKey: DEFAULT_INTERNAL_KEY,
    });
  });

  it("allows environment overrides for Docker or custom local ports", () => {
    expect(
      resolveFrontendRuntimeConfig({
        NUXT_API_BASE_URL: "http://be:3000",
        NUXT_API_INTERNAL_KEY: "compose-internal-key",
      }),
    ).toEqual({
      apiBaseUrl: "http://be:3000",
      apiInternalKey: "compose-internal-key",
    });
  });

  it("documents the frontend dev port used by the Docker quickstart", () => {
    expect(DEFAULT_FRONTEND_PORT).toBe(3001);
  });
});
