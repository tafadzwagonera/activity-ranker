import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'dotenv';

const packageRootDir = resolve(__dirname, '..');
const repoRootDir = resolve(packageRootDir, '..', '..');

/**
 * @returns Env file paths in ascending precedence order for direct backend startup.
 */
export const resolveBackendEnvFilePaths = (): readonly string[] =>
  [
    resolve(repoRootDir, '.env'),
    resolve(packageRootDir, '.env'),
    resolve(repoRootDir, '.env.local'),
    resolve(packageRootDir, '.env.local'),
  ] as const;

/**
 * @param runtimeEnv Mutable runtime environment that receives loaded values.
 * @param envFilePaths Candidate env file paths in ascending precedence order.
 * @returns void
 */
export const loadBackendRuntimeEnv = ({
  runtimeEnv = process.env,
  envFilePaths = resolveBackendEnvFilePaths(),
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

    const parsedEnv = parse(readFileSync(envFilePath, 'utf8'));

    for (const [key, value] of Object.entries(parsedEnv)) {
      if (protectedKeys.has(key) && !loadedKeys.has(key)) {
        continue;
      }

      runtimeEnv[key] = value;
      loadedKeys.add(key);
    }
  }
};
