export const DEFAULT_NEXT_PORT = 3002 as const;
export const DEFAULT_BACKEND_PORT = 3000 as const;
export const DEFAULT_INTERNAL_KEY = "internal-dev-key" as const;

/**
 * @param runtimeEnv Environment values available when Next boots.
 * @returns Runtime config defaults for local Node/Yarn and Docker-first development.
 */
export const resolveNextRuntimeConfig = (
  runtimeEnv: NodeJS.ProcessEnv,
): {
  apiBaseUrl: string;
  apiInternalKey: string;
} => ({
  apiBaseUrl:
    runtimeEnv.NEXT_API_BASE_URL ?? `http://localhost:${DEFAULT_BACKEND_PORT}`,
  apiInternalKey: runtimeEnv.NEXT_API_INTERNAL_KEY ?? DEFAULT_INTERNAL_KEY,
});
