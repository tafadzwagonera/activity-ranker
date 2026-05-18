const DEFAULT_PUBLIC_API_KEY = 'public-dev-key' as const;
const DEFAULT_INTERNAL_API_KEY = 'internal-dev-key' as const;

/**
 * @returns True when the backend is running in a non-production Node process.
 */
const isLocalRuntime = (): boolean =>
  (process.env.NODE_ENV ?? 'development') !== 'production';

/**
 * Applies documented local auth defaults for direct Nest startup without affecting production deployments.
 *
 * @returns void
 */
export const applyLocalAuthDefaults = (): void => {
  if (!isLocalRuntime()) {
    return;
  }

  process.env.API_KEY_PUBLIC_VALUES ??= DEFAULT_PUBLIC_API_KEY;
  process.env.API_KEY_INTERNAL_VALUES ??= DEFAULT_INTERNAL_API_KEY;
};
