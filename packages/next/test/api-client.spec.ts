import { describe, expect, it, vi } from "vitest";

import {
  buildRankingsRequest,
  buildSearchRequest,
  fetchRankings,
  fetchSearchResults,
} from "../utils/api-client";

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

  it("parses valid rankings responses", async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          location: {
            latitude: -33.9249,
            longitude: 18.4241,
            name: "Cape Town",
          },
          days: [],
        }),
      ),
    );

    await expect(
      fetchRankings({
        fetcher: mockFetch,
        latitude: -33.9249,
        longitude: 18.4241,
        transport: "rest",
      }),
    ).resolves.toEqual({
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
      days: [],
    });
  });

  it("rejects invalid rankings payloads", async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          location: {
            latitude: -33.9249,
            longitude: 18.4241,
            name: "Cape Town",
          },
        }),
      ),
    );

    await expect(
      fetchRankings({
        fetcher: mockFetch,
        latitude: -33.9249,
        longitude: 18.4241,
        transport: "rest",
      }),
    ).rejects.toThrow();
  });

  it("rejects non-OK search responses", async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: "Backend request failed." }), {
        status: 502,
      }),
    );

    await expect(
      fetchSearchResults({
        fetcher: mockFetch,
        query: "Cape Town",
        transport: "graphql",
      }),
    ).rejects.toThrow("Request failed with status 502.");
  });
});
