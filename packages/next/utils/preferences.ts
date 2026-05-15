import type { TransportMode } from "@activity-ranker/shared";

export type ThemeMode = "light" | "dark";

export const preferenceStorageKeys = {
  theme: "activity-ranker-next-theme",
  transport: "activity-ranker-next-transport",
} as const;

export const preferenceCookieNames = {
  theme: "activity-ranker-next-theme",
  transport: "activity-ranker-next-transport",
} as const;

/**
 * @param value Raw persisted theme value.
 * @returns A valid theme mode, defaulting to light for invalid input.
 */
export const resolveThemePreference = (value: string | undefined): ThemeMode =>
  value === "dark" ? "dark" : "light";

/**
 * @param value Raw persisted transport value.
 * @returns A valid transport mode, defaulting to rest for invalid input.
 */
export const resolveTransportPreference = (
  value: string | undefined,
): TransportMode => (value === "graphql" ? "graphql" : "rest");

/**
 * @param name Preference cookie name.
 * @param value Preference cookie value.
 * @returns A cookie string suitable for document.cookie assignment.
 */
export const buildPreferenceCookie = ({
  name,
  value,
}: {
  name: string;
  value: string;
}) =>
  `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
