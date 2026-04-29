export const DEFAULT_FRONTEND_PORT = 3001 as const;
export const DEFAULT_BACKEND_PORT = 3000 as const;
export const DEFAULT_INTERNAL_KEY = "internal-dev-key" as const;

/**
 * @param runtimeEnv Environment values available when Nuxt boots.
 * @returns Runtime config defaults for local Node/Yarn and Docker-first development.
 */
export const resolveFrontendRuntimeConfig = (
  runtimeEnv: NodeJS.ProcessEnv,
): {
  apiBaseUrl: string;
  apiInternalKey: string;
} => ({
  apiBaseUrl:
    runtimeEnv.NUXT_API_BASE_URL ?? `http://localhost:${DEFAULT_BACKEND_PORT}`,
  apiInternalKey: runtimeEnv.NUXT_API_INTERNAL_KEY ?? DEFAULT_INTERNAL_KEY,
});
