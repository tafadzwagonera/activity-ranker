import { afterEach, describe, expect, it, vi } from "vitest";

import nuxtConfig from "../nuxt.config";

describe("frontend config", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("keeps the Venture page metadata configured", () => {
    expect(nuxtConfig.app?.head?.title).toBe("Venture Activity Forecast");
    expect(nuxtConfig.css).toContain("~/assets/css/main.css");
    expect(nuxtConfig.ssr).toBe(false);
  });

  it("keeps Playwright isolated to the browser e2e suite", async () => {
    vi.stubEnv("CI", "");
    const { default: playwrightConfig } = await import("../playwright.config");

    expect(playwrightConfig.testDir).toBe("./test/e2e");
    expect(String(playwrightConfig.testMatch)).toContain("\\.e2e\\.ts");
    expect(playwrightConfig.webServer?.port).toBe(3101);
    expect(playwrightConfig.webServer?.reuseExistingServer).toBe(true);
  });

  it("disables server reuse in CI", async () => {
    vi.stubEnv("CI", "true");
    const { default: playwrightConfig } = await import("../playwright.config");

    expect(playwrightConfig.webServer?.reuseExistingServer).toBe(false);
  });
});
