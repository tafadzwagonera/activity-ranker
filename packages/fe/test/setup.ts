import http from "node:http";
import net from "node:net";

import { cleanup } from "@testing-library/vue";
import { computed, ref, watch } from "vue";
import { afterEach, beforeAll, vi } from "vitest";

vi.stubGlobal("computed", computed);
vi.stubGlobal("defineEventHandler", <T>(handler: T) => handler);
vi.stubGlobal("defineNuxtConfig", <T>(config: T) => config);
vi.stubGlobal("ref", ref);
vi.stubGlobal("watch", watch);

const patchedPrototypes = new Set<object>();

const createMockStorage = (): Storage => {
  const values = new Map<string, string>();

  return {
    clear() {
      values.clear();
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
    removeItem(key: string) {
      values.delete(key);
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
  };
};

const ensureLocalStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  if (
    typeof window.localStorage?.getItem === "function" &&
    typeof window.localStorage?.setItem === "function"
  ) {
    return;
  }

  const mockStorage = createMockStorage();

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: mockStorage,
  });
  vi.stubGlobal("localStorage", mockStorage);
};

const blockListenCalls = (prototype: { listen?: unknown }, label: string) => {
  if (patchedPrototypes.has(prototype)) {
    return;
  }

  const originalListen = prototype.listen;

  if (typeof originalListen !== "function") {
    return;
  }

  Object.defineProperty(prototype, "listen", {
    configurable: true,
    value() {
      throw new Error(
        `Port binding is not allowed in Vitest/Nuxt tests. Blocked ${label}.listen().`,
      );
    },
    writable: true,
  });

  patchedPrototypes.add(prototype);
};

beforeAll(() => {
  blockListenCalls(net.Server.prototype, "net.Server");
  blockListenCalls(http.Server.prototype, "http.Server");
  ensureLocalStorage();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.clearAllTimers();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  if (typeof window !== "undefined") {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  }
});
