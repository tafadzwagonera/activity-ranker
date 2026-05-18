import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import {
  loadFrontendRuntimeEnv,
  resolveFrontendEnvFilePaths,
} from "../utils/load-runtime-env";

const createMockEnvDir = () => mkdtempSync(join(tmpdir(), "fe-env-"));

describe("loadFrontendRuntimeEnv", () => {
  it("layers repo and package env files without overriding shell env", () => {
    const tempDir = createMockEnvDir();
    const repoEnvPath = join(tempDir, ".env");
    const packageEnvPath = join(tempDir, "packages.fe.env");
    const repoLocalEnvPath = join(tempDir, ".env.local");
    const packageLocalEnvPath = join(tempDir, "packages.fe.env.local");

    writeFileSync(
      repoEnvPath,
      [
        "NUXT_API_BASE_URL=http://repo:3000",
        "NUXT_API_INTERNAL_KEY=repo-key",
      ].join("\n"),
    );
    writeFileSync(
      packageEnvPath,
      ["NUXT_API_BASE_URL=http://package:3000"].join("\n"),
    );
    writeFileSync(
      repoLocalEnvPath,
      ["NUXT_API_INTERNAL_KEY=repo-local-key"].join("\n"),
    );
    writeFileSync(
      packageLocalEnvPath,
      ["NUXT_API_INTERNAL_KEY=package-local-key"].join("\n"),
    );

    const runtimeEnv: NodeJS.ProcessEnv = {
      NUXT_API_BASE_URL: "http://shell:3000",
    };

    loadFrontendRuntimeEnv({
      envFilePaths: [
        repoEnvPath,
        packageEnvPath,
        repoLocalEnvPath,
        packageLocalEnvPath,
      ],
      runtimeEnv,
    });

    expect(runtimeEnv.NUXT_API_BASE_URL).toBe("http://shell:3000");
    expect(runtimeEnv.NUXT_API_INTERNAL_KEY).toBe("package-local-key");

    rmSync(tempDir, { force: true, recursive: true });
  });

  it("returns repo-first and package-last default env path precedence", () => {
    expect(resolveFrontendEnvFilePaths()).toHaveLength(4);
    expect(resolveFrontendEnvFilePaths()[0]).toMatch(/\.env$/);
    expect(resolveFrontendEnvFilePaths()[3]).toMatch(
      /packages\/fe\/\.env\.local$/,
    );
  });
});
