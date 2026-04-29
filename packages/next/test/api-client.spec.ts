import { describe, expect, it } from "vitest";

import { buildRankingsRequest, buildSearchRequest } from "../utils/api-client";

describe("next api client helpers", () => {
  it("builds local REST ranking proxy requests", () => {
    const request = buildRankingsRequest({
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "rest",
    });

    expect(request).toEqual({
      method: "GET",
      url: "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
    });
  });

  it("builds local GraphQL ranking proxy requests", () => {
    const request = buildRankingsRequest({
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });

    expect(request).toEqual({
      method: "GET",
      url: "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql",
    });
  });

  it("builds local search proxy requests", () => {
    const request = buildSearchRequest({
      query: "Cape Town",
      transport: "graphql",
    });

    expect(request).toEqual({
      method: "GET",
      url: "/api/locations/search?query=Cape%20Town&transport=graphql",
    });
  });
});
