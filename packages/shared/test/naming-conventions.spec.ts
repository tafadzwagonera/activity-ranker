import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("repository naming conventions", () => {
  it("keeps non-literal repo-owned exports camelCase outside NestJS DI tokens", () => {
    const fileExpectations = [
      {
        allowedUppercaseExports: [] as string[],
        filePath: resolve(__dirname, "../src/contracts.ts"),
      },
      {
        allowedUppercaseExports: [] as string[],
        filePath: resolve(
          __dirname,
          "../../be/src/integrations/weather/open-meteo.config.ts",
        ),
      },
      {
        allowedUppercaseExports: ["WEATHER_PROVIDER", "GEOCODING_PROVIDER"],
        filePath: resolve(
          __dirname,
          "../../be/src/integrations/weather/weather.constants.ts",
        ),
      },
    ];

    for (const { allowedUppercaseExports, filePath } of fileExpectations) {
      const source = readFileSync(filePath, "utf8");
      const uppercaseExports = Array.from(
        source.matchAll(/export const ([A-Z][A-Z0-9_]*)\s*=/g),
        (match) => match[1] ?? "",
      );

      expect(uppercaseExports).toEqual(allowedUppercaseExports);
    }
  });
});
