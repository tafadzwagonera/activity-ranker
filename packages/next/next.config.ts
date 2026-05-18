import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

import { loadNextRuntimeEnv } from "./utils/load-runtime-env";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(currentDir, "../..");

loadNextRuntimeEnv();

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
