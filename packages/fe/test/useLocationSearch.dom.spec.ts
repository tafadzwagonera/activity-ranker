// @vitest-environment happy-dom
import { nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";

import type {
  LocationSuggestion,
  TransportMode,
} from "@activity-ranker/shared";
import { useLocationSearch } from "../composables/useLocationSearch";

const { mockFetchSearchResults } = vi.hoisted(() => ({
  mockFetchSearchResults: vi.fn<
    Promise<LocationSuggestion[]>,
    [{ query: string; transport: TransportMode }]
  >(),
}));

vi.mock("../utils/api-client", () => ({
  fetchSearchResults: mockFetchSearchResults,
}));

describe("useLocationSearch", () => {
  it("does not search until the query reaches three characters", async () => {
    vi.useFakeTimers();
    const transport = ref<TransportMode>("rest");
    const { query, results } = useLocationSearch(transport);

    results.value = [
      {
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
    ];
    query.value = "Ca";
    await nextTick();
    await vi.advanceTimersByTimeAsync(350);

    expect(mockFetchSearchResults).not.toHaveBeenCalled();
    expect(results.value).toEqual([]);
  });

  it("debounces input and searches with the latest trimmed query", async () => {
    vi.useFakeTimers();
    mockFetchSearchResults.mockResolvedValue([
      {
        admin1: "Western Cape",
        country: "South Africa",
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
    ]);
    const transport = ref<TransportMode>("rest");
    const { query, results } = useLocationSearch(transport);

    query.value = "Cape";
    await nextTick();
    query.value = "  Cape Town  ";
    await nextTick();
    await vi.advanceTimersByTimeAsync(350);

    expect(mockFetchSearchResults).toHaveBeenCalledTimes(1);
    expect(mockFetchSearchResults).toHaveBeenCalledWith({
      query: "Cape Town",
      transport: "rest",
    });
    expect(results.value[0]?.name).toBe("Cape Town");
  });

  it("exposes a user-facing error when the search request fails", async () => {
    vi.useFakeTimers();
    mockFetchSearchResults.mockRejectedValue(new Error("boom"));
    const transport = ref<TransportMode>("graphql");
    const { error, query, results } = useLocationSearch(transport);

    query.value = "Cape Town";
    await nextTick();
    await vi.advanceTimersByTimeAsync(350);

    expect(error.value).toBe("Unable to search for this location.");
    expect(results.value).toEqual([]);
  });
});
