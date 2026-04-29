// @vitest-environment happy-dom
import { fireEvent, render, screen } from "@testing-library/vue";
import { cleanup } from "@testing-library/vue";
import { nextTick, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import IndexPage from "../app/pages/index.vue";

const mockSearchState = {
  error: ref<string | null>(null),
  loading: ref(false),
  query: ref("Cape"),
  results: ref<LocationSuggestion[]>([]),
};

const mockRankingsState = {
  data: ref<RankedActivitiesResponse | null>(null),
  error: ref<string | null>(null),
  loadRankings: vi.fn<Promise<void>, [LocationSuggestion]>(async () => {}),
  loading: ref(false),
};

vi.mock("../composables/useLocationSearch", () => ({
  useLocationSearch: (transport: { value: TransportMode }) => {
    void transport;
    return mockSearchState;
  },
}));

vi.mock("../composables/useActivityRankings", () => ({
  useActivityRankings: (transport: { value: TransportMode }) => {
    void transport;
    return mockRankingsState;
  },
}));

const mockLocations: LocationSuggestion[] = [
  {
    admin1: "Western Cape",
    country: "South Africa",
    id: 1,
    latitude: -33.9249,
    longitude: 18.4241,
    name: "Cape Town",
  },
  {
    admin1: "England",
    country: "United Kingdom",
    id: 2,
    latitude: 51.5072,
    longitude: -0.1276,
    name: "London",
  },
];

const mockRankings: RankedActivitiesResponse = {
  location: {
    admin1: "Western Cape",
    country: "South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
    name: "Cape Town",
  },
  days: [
    {
      activities: [
        {
          activity: "surfing",
          confidence: 0.91,
          reasons: ["Matched nearby surf spot Muizenberg."],
          score: 0.82,
        },
      ],
      date: "2026-04-29",
    },
  ],
};

const installMockLocalStorage = () => {
  const values = new Map<string, string>();
  const mockStorage: Storage = {
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

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: mockStorage,
  });
  vi.stubGlobal("localStorage", mockStorage);
};

describe("index page", () => {
  beforeEach(() => {
    installMockLocalStorage();
    cleanup();
    mockSearchState.error.value = null;
    mockSearchState.loading.value = false;
    mockSearchState.query.value = "Cape";
    mockSearchState.results.value = [];
    mockRankingsState.data.value = null;
    mockRankingsState.error.value = null;
    mockRankingsState.loading.value = false;
    mockRankingsState.loadRankings.mockReset();
    document.documentElement.removeAttribute("data-theme");
  });

  it("restores persisted theme and transport, then persists theme changes", async () => {
    window.localStorage.setItem("activity-ranker-theme", "dark");
    window.localStorage.setItem("activity-ranker-transport", "graphql");

    render(IndexPage);
    await nextTick();

    expect(screen.getByText("GraphQL transport")).toBeTruthy();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    await fireEvent.click(
      screen.getByRole("button", { name: "Switch to light theme" }),
    );

    expect(window.localStorage.getItem("activity-ranker-theme")).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("renders rankings for the selected location and blocks selecting a second one", async () => {
    mockSearchState.results.value = mockLocations;
    mockRankingsState.data.value = mockRankings;

    render(IndexPage);
    await nextTick();

    await fireEvent.click(
      screen.getAllByRole("button", { name: /Cape Town/ })[0]!,
    );

    expect(mockRankingsState.loadRankings).toHaveBeenCalledWith(
      mockLocations[0],
    );
    expect(screen.getByText("Selected destination")).toBeTruthy();
    expect(screen.getByText("Best activities")).toBeTruthy();
    expect(screen.getByText("surfing")).toBeTruthy();

    await fireEvent.click(
      screen.getAllByRole("button", { name: /London/ })[0]!,
    );

    expect(screen.getByText(/Selecting multiple cities or towns/)).toBeTruthy();
    expect(mockRankingsState.loadRankings).toHaveBeenCalledTimes(1);
  });

  it("persists transport changes for a selected location and clears the selection", async () => {
    mockSearchState.results.value = [mockLocations[0]];
    mockRankingsState.data.value = mockRankings;
    window.localStorage.setItem("activity-ranker-transport", "graphql");

    render(IndexPage);
    await nextTick();

    await fireEvent.click(
      screen.getAllByRole("button", { name: /Cape Town/ })[0]!,
    );
    await fireEvent.click(screen.getByRole("button", { name: "REST" }));
    await nextTick();

    expect(window.localStorage.getItem("activity-ranker-transport")).toBe(
      "rest",
    );
    expect(mockRankingsState.loadRankings).toHaveBeenCalledTimes(2);

    await fireEvent.click(screen.getByRole("button", { name: "×" }));

    expect(screen.queryByText("Selected destination")).toBeNull();
  });

  it("shows loading and error states for search and rankings", async () => {
    mockSearchState.loading.value = true;
    mockSearchState.results.value = [mockLocations[0]];
    mockRankingsState.loading.value = true;

    render(IndexPage);
    await nextTick();

    expect(
      screen.getAllByText("Searching destinations…").length,
    ).toBeGreaterThan(0);

    await fireEvent.click(
      screen.getAllByRole("button", { name: /Cape Town/ })[0]!,
    );
    await nextTick();

    expect(document.querySelectorAll(".loading-card")).toHaveLength(3);

    mockSearchState.loading.value = false;
    mockSearchState.error.value = "Unable to search for this location.";
    mockRankingsState.loading.value = false;
    mockRankingsState.error.value = "Unable to load activity rankings.";
    await nextTick();

    expect(
      screen.getByText("Unable to search for this location."),
    ).toBeTruthy();
    expect(screen.getByText("Unable to load activity rankings.")).toBeTruthy();
  });
});
