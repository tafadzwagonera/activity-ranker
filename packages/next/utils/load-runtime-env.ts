import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "dotenv";

const packageRootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRootDir = resolve(packageRootDir, "..", "..");

/**
 * @returns Env file paths in ascending precedence order for direct Next startup.
 */
export const resolveNextEnvFilePaths = (): readonly string[] =>
  [
    resolve(repoRootDir, ".env"),
    resolve(packageRootDir, ".env"),
    resolve(repoRootDir, ".env.local"),
    resolve(packageRootDir, ".env.local"),
  ] as const;

/**
 * @param runtimeEnv Mutable runtime environment that receives loaded values.
 * @param envFilePaths Candidate env file paths in ascending precedence order.
 * @returns void
 */
export const loadNextRuntimeEnv = ({
  runtimeEnv = process.env,
  envFilePaths = resolveNextEnvFilePaths(),
}: {
  runtimeEnv?: NodeJS.ProcessEnv;
  envFilePaths?: readonly string[];
} = {}): void => {
  const protectedKeys = new Set(
    Object.entries(runtimeEnv)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => key),
  );
  const loadedKeys = new Set<string>();

  for (const envFilePath of envFilePaths) {
    if (!existsSync(envFilePath)) {
      continue;
    }

    const parsedEnv = parse(readFileSync(envFilePath, "utf8"));

    for (const [key, value] of Object.entries(parsedEnv)) {
      if (protectedKeys.has(key) && !loadedKeys.has(key)) {
        continue;
      }

      runtimeEnv[key] = value;
      loadedKeys.add(key);
    }
  }
};
