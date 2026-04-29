// @vitest-environment happy-dom
import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import { useActivityRankings } from "../composables/useActivityRankings";

const { mockFetchRankings } = vi.hoisted(() => ({
  mockFetchRankings: vi.fn<
    Promise<RankedActivitiesResponse>,
    [{ latitude: number; longitude: number; transport: TransportMode }]
  >(),
}));

vi.mock("../utils/api-client", () => ({
  fetchRankings: mockFetchRankings,
}));

const mockLocation: LocationSuggestion = {
  admin1: "Western Cape",
  country: "South Africa",
  id: 1,
  latitude: -33.9249,
  longitude: 18.4241,
  name: "Cape Town",
};

describe("useActivityRankings", () => {
  it("loads rankings for the selected location", async () => {
    const mockResponse: RankedActivitiesResponse = {
      location: {
        admin1: "Western Cape",
        country: "South Africa",
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
      days: [],
    };
    mockFetchRankings.mockResolvedValue(mockResponse);
    const transport = ref<TransportMode>("graphql");
    const { data, error, loadRankings, loading } =
      useActivityRankings(transport);

    await loadRankings(mockLocation);

    expect(mockFetchRankings).toHaveBeenCalledWith({
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });
    expect(data.value).toEqual(mockResponse);
    expect(error.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it("clears stale data and exposes a user-facing error on failure", async () => {
    mockFetchRankings.mockRejectedValue(new Error("boom"));
    const transport = ref<TransportMode>("rest");
    const { data, error, loadRankings, loading } =
      useActivityRankings(transport);

    data.value = {
      location: {
        latitude: 0,
        longitude: 0,
        name: "Stale data",
      },
      days: [],
    };

    await loadRankings(mockLocation);

    expect(data.value).toBeNull();
    expect(error.value).toBe("Unable to load activity rankings.");
    expect(loading.value).toBe(false);
  });
});
