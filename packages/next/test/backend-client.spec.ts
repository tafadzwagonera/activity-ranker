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
