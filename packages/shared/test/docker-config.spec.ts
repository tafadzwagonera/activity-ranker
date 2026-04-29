import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("docker workspace image inputs", () => {
  it("installs dependencies during image build before copying mutable source files", () => {
    const dockerfile = readFileSync(
      resolve(__dirname, "../../../Dockerfile"),
      "utf8",
    );

    const installIndex = dockerfile.indexOf(
      "RUN yarn install --non-interactive --ignore-scripts",
    );
    const backendSourceIndex = dockerfile.indexOf(
      "COPY packages/be/src packages/be/src",
    );
    const sharedSourceIndex = dockerfile.indexOf(
      "COPY packages/shared/src packages/shared/src",
    );

    expect(installIndex).toBeGreaterThan(-1);
    expect(backendSourceIndex).toBeGreaterThan(installIndex);
    expect(sharedSourceIndex).toBeGreaterThan(installIndex);
  });

  it("keeps the Next workspace available in Docker Compose", () => {
    const composeFile = readFileSync(
      resolve(__dirname, "../../../compose.yml"),
      "utf8",
    );

    expect(composeFile).not.toContain("\n  deps:\n");
    expect(composeFile).not.toContain(
      "condition: service_completed_successfully",
    );
    expect(composeFile).toContain("\n  next:\n");
    expect(composeFile).toContain(
      "activity-ranker-next-node-modules:/workspace/packages/next/node_modules",
    );
    expect(composeFile).toContain("NEXT_API_BASE_URL: http://be:3000");
    expect(composeFile).toContain("NEXT_API_INTERNAL_KEY: internal-dev-key");
  });
});
