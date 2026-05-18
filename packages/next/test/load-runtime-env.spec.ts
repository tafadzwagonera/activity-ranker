import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

import {
  loadNextRuntimeEnv,
  resolveNextEnvFilePaths,
} from "../utils/load-runtime-env";

const createMockEnvDir = () => mkdtempSync(join(tmpdir(), "next-env-"));

describe("loadNextRuntimeEnv", () => {
  it("layers repo and package env files without overriding shell env", () => {
    const tempDir = createMockEnvDir();
    const repoEnvPath = join(tempDir, ".env");
    const packageEnvPath = join(tempDir, "packages.next.env");
    const repoLocalEnvPath = join(tempDir, ".env.local");
    const packageLocalEnvPath = join(tempDir, "packages.next.env.local");

    writeFileSync(
      repoEnvPath,
      [
        "NEXT_API_BASE_URL=http://repo:3000",
        "NEXT_API_INTERNAL_KEY=repo-key",
      ].join("\n"),
    );
    writeFileSync(
      packageEnvPath,
      ["NEXT_API_BASE_URL=http://package:3000"].join("\n"),
    );
    writeFileSync(
      repoLocalEnvPath,
      ["NEXT_API_INTERNAL_KEY=repo-local-key"].join("\n"),
    );
    writeFileSync(
      packageLocalEnvPath,
      ["NEXT_API_INTERNAL_KEY=package-local-key"].join("\n"),
    );

    const runtimeEnv = {
      NEXT_API_BASE_URL: "http://shell:3000",
    } as unknown as NodeJS.ProcessEnv;

    loadNextRuntimeEnv({
      envFilePaths: [
        repoEnvPath,
        packageEnvPath,
        repoLocalEnvPath,
        packageLocalEnvPath,
      ],
      runtimeEnv,
    });

    expect(runtimeEnv.NEXT_API_BASE_URL).toBe("http://shell:3000");
    expect(runtimeEnv.NEXT_API_INTERNAL_KEY).toBe("package-local-key");

    rmSync(tempDir, { force: true, recursive: true });
  });

  it("returns repo-first and package-last default env path precedence", () => {
    expect(resolveNextEnvFilePaths()).toHaveLength(4);
    expect(resolveNextEnvFilePaths()[0]).toMatch(/\.env$/);
    expect(resolveNextEnvFilePaths()[3]).toMatch(
      /packages\/next\/\.env\.local$/,
    );
  });
});
