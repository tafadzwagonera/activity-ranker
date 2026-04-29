import { describe, expect, it } from "vitest";

import {
  DEFAULT_BACKEND_PORT,
  DEFAULT_INTERNAL_KEY,
  DEFAULT_NEXT_PORT,
  resolveNextRuntimeConfig,
} from "../utils/dev-runtime-config";

describe("next dev runtime config", () => {
  it("uses localhost backend defaults for local development", () => {
    expect(resolveNextRuntimeConfig({} as NodeJS.ProcessEnv)).toEqual({
      apiBaseUrl: `http://localhost:${DEFAULT_BACKEND_PORT}`,
      apiInternalKey: DEFAULT_INTERNAL_KEY,
    });
  });

  it("allows environment overrides for Docker or custom local ports", () => {
    expect(
      resolveNextRuntimeConfig({
        NEXT_API_BASE_URL: "http://be:3000",
        NEXT_API_INTERNAL_KEY: "compose-internal-key",
      } as unknown as NodeJS.ProcessEnv),
    ).toEqual({
      apiBaseUrl: "http://be:3000",
      apiInternalKey: "compose-internal-key",
    });
  });

  it("documents the next dev port for the parallel frontend", () => {
    expect(DEFAULT_NEXT_PORT).toBe(3002);
  });
});
