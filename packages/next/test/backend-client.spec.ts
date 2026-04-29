import { describe, expect, it } from "vitest";

import {
  buildBackendHeaders,
  buildBackendSearchRequest,
} from "../server/backend-client";

describe("next backend client helpers", () => {
  it("adds XInternalKey for server-side backend calls", () => {
    expect(buildBackendHeaders("internal-key")).toEqual({
      XInternalKey: "internal-key",
    });
  });

  it("adds x-request-id for correlated backend calls", () => {
    expect(buildBackendHeaders("internal-key", "request-123")).toEqual({
      XInternalKey: "internal-key",
      "x-request-id": "request-123",
    });
  });

  it("builds backend GraphQL search requests", () => {
    const request = buildBackendSearchRequest({
      apiBaseUrl: "http://localhost:3000",
      query: "Cape Town",
      transport: "graphql",
    });

    expect(request.url).toBe("http://localhost:3000/graphql");
    expect(request.method).toBe("POST");
    expect(String(request.body)).toContain("searchLocations");
  });
});
