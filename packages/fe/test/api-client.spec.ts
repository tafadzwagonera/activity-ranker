import { describe, expect, it, vi } from "vitest";

import {
  buildRankingsRequest,
  buildSearchRequest,
  fetchRankings,
  fetchSearchResults,
} from "../utils/api-client";

describe("api client helpers", () => {
  it("builds local REST ranking proxy requests", () => {
    const request = buildRankingsRequest({
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "rest",
    });

    expect(request.url).toBe(
      "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
    );
    expect(request.method).toBe("GET");
  });

  it("builds local GraphQL ranking proxy requests", () => {
    const request = buildRankingsRequest({
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });

    expect(request.url).toBe(
      "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql",
    );
    expect(request.method).toBe("GET");
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

  it("fetches rankings through the same-origin proxy", async () => {
    const mockFetcher = vi.fn().mockResolvedValue({ days: [], location: {} });

    await fetchRankings({
      fetcher: mockFetcher,
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });

    expect(mockFetcher).toHaveBeenCalledWith(
      "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql",
      { method: "GET" },
    );
  });

  it("fetches search results through the same-origin proxy", async () => {
    const mockFetcher = vi.fn().mockResolvedValue([]);

    await fetchSearchResults({
      fetcher: mockFetcher,
      query: "Cape Town",
      transport: "rest",
    });

    expect(mockFetcher).toHaveBeenCalledWith(
      "/api/locations/search?query=Cape%20Town&transport=rest",
      { method: "GET" },
    );
  });
});
