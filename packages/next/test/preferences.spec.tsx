// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ActivityRankerClient } from "../components/activity-ranker-client";
import {
  preferenceCookieNames,
  preferenceStorageKeys,
  resolveThemePreference,
  resolveTransportPreference,
} from "../utils/preferences";

const clearClientPreferences = () => {
  window.localStorage.clear();
  document.cookie = `${preferenceCookieNames.theme}=; Max-Age=0; Path=/`;
  document.cookie = `${preferenceCookieNames.transport}=; Max-Age=0; Path=/`;
  document.documentElement.removeAttribute("data-theme");
};

describe("preference helpers", () => {
  it("defaults invalid theme preferences to light", () => {
    expect(resolveThemePreference("dark")).toBe("dark");
    expect(resolveThemePreference("light")).toBe("light");
    expect(resolveThemePreference("blue")).toBe("light");
    expect(resolveThemePreference(undefined)).toBe("light");
  });

  it("defaults invalid transport preferences to rest", () => {
    expect(resolveTransportPreference("graphql")).toBe("graphql");
    expect(resolveTransportPreference("rest")).toBe("rest");
    expect(resolveTransportPreference("ftp")).toBe("rest");
    expect(resolveTransportPreference(undefined)).toBe("rest");
  });
});

describe("ActivityRankerClient preference persistence", () => {
  afterEach(() => {
    cleanup();
    clearClientPreferences();
  });

  it("hydrates initial preferences into the DOM and local storage", () => {
    render(
      <ActivityRankerClient initialTheme="dark" initialTransport="graphql" />,
    );

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(preferenceStorageKeys.theme)).toBe(
      "dark",
    );
    expect(window.localStorage.getItem(preferenceStorageKeys.transport)).toBe(
      "graphql",
    );
    expect(document.cookie).toContain(`${preferenceCookieNames.theme}=dark`);
    expect(document.cookie).toContain(
      `${preferenceCookieNames.transport}=graphql`,
    );
    expect(screen.getByText("GraphQL transport")).toBeTruthy();
  });

  it("persists preference updates to both local storage and cookies", () => {
    render(
      <ActivityRankerClient initialTheme="light" initialTransport="rest" />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Switch to dark theme" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "GraphQL" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(preferenceStorageKeys.theme)).toBe(
      "dark",
    );
    expect(window.localStorage.getItem(preferenceStorageKeys.transport)).toBe(
      "graphql",
    );
    expect(document.cookie).toContain(`${preferenceCookieNames.theme}=dark`);
    expect(document.cookie).toContain(
      `${preferenceCookieNames.transport}=graphql`,
    );
  });
});
