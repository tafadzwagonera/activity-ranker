import { describe, expect, it, vi } from "vitest";

import {
  buildBackendHeaders,
  buildBackendRankingsRequest,
  buildBackendSearchRequest,
  fetchBackendRankings,
  fetchBackendSearchResults,
} from "../server/utils/backend-client";

describe("backend client helpers", () => {
  it("adds XInternalKey for server-side backend calls", () => {
    expect(buildBackendHeaders("internal-key")).toEqual({
      XInternalKey: "internal-key",
    });
  });

  it("builds backend GraphQL search requests", () => {
    const request = buildBackendSearchRequest({
      apiBaseUrl: "http://localhost:3001",
      query: "Cape Town",
      transport: "graphql",
    });

    expect(request.url).toBe("http://localhost:3001/graphql");
    expect(request.method).toBe("POST");
    expect(String(request.body)).toContain("searchLocations");
  });

  it("builds backend REST ranking requests", () => {
    expect(
      buildBackendRankingsRequest({
        apiBaseUrl: "http://localhost:3000",
        latitude: -33.9249,
        longitude: 18.4241,
        transport: "rest",
      }),
    ).toEqual({
      method: "GET",
      url: "http://localhost:3000/locations/-33.9249/18.4241/rank-activities",
    });
  });

  it("extracts REST search results with internal auth headers", async () => {
    const mockFetcher = vi
      .fn()
      .mockResolvedValue([{ id: 1, name: "Cape Town" }]);

    const result = await fetchBackendSearchResults({
      apiBaseUrl: "http://localhost:3000",
      fetcher: mockFetcher,
      internalKey: "internal-key",
      query: "Cape Town",
      transport: "rest",
    });

    expect(result).toEqual([{ id: 1, name: "Cape Town" }]);
    expect(mockFetcher).toHaveBeenCalledWith(
      "http://localhost:3000/locations/search?query=Cape%20Town",
      {
        headers: { XInternalKey: "internal-key" },
        method: "GET",
      },
    );
  });

  it("extracts GraphQL search results from the backend payload", async () => {
    const mockFetcher = vi.fn().mockResolvedValue({
      data: {
        searchLocations: [{ id: 1, name: "Cape Town" }],
      },
    });

    const result = await fetchBackendSearchResults({
      apiBaseUrl: "http://localhost:3000",
      fetcher: mockFetcher,
      internalKey: "internal-key",
      query: "Cape Town",
      transport: "graphql",
    });

    expect(result).toEqual([{ id: 1, name: "Cape Town" }]);
    expect(mockFetcher.mock.calls[0]?.[1]).toMatchObject({
      headers: {
        "content-type": "application/json",
        XInternalKey: "internal-key",
      },
      method: "POST",
    });
  });

  it("extracts REST rankings from the backend payload", async () => {
    const mockResponse = {
      days: [],
      location: {
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
    };
    const mockFetcher = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchBackendRankings({
      apiBaseUrl: "http://localhost:3000",
      fetcher: mockFetcher,
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "rest",
    });

    expect(result).toBe(mockResponse);
  });

  it("extracts GraphQL rankings from the backend payload", async () => {
    const mockResponse = {
      data: {
        rankActivitiesByCoordinates: {
          days: [],
          location: {
            latitude: -33.9249,
            longitude: 18.4241,
            name: "Cape Town",
          },
        },
      },
    };
    const mockFetcher = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchBackendRankings({
      apiBaseUrl: "http://localhost:3000",
      fetcher: mockFetcher,
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });

    expect(result).toEqual(mockResponse.data.rankActivitiesByCoordinates);
    expect(String(mockFetcher.mock.calls[0]?.[1]?.body)).toContain(
      "rankActivitiesByCoordinates",
    );
  });
});
