import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from "@activity-ranker/shared";

export type SearchState = {
  status: "idle" | "loading" | "success" | "error";
  results: LocationSuggestion[];
  error: string | null;
};

export type RankingsState = {
  status: "idle" | "loading" | "success" | "error";
  data: RankedActivitiesResponse | null;
  error: string | null;
};

/**
 * @returns The neutral search lifecycle state before or after an invalid query.
 */
export const createIdleSearchState = (): SearchState => ({
  error: null,
  results: [],
  status: "idle",
});

/**
 * @param results Latest search results that should remain visible while refetching.
 * @returns The loading search lifecycle state.
 */
export const createSearchLoadingState = (
  results: LocationSuggestion[],
): SearchState => ({
  error: null,
  results,
  status: "loading",
});

/**
 * @param results Search results returned from the API.
 * @returns The successful search lifecycle state.
 */
export const createSearchSuccessState = (
  results: LocationSuggestion[],
): SearchState => ({
  error: null,
  results,
  status: "success",
});

/**
 * @param error Human-readable search failure message.
 * @returns The failed search lifecycle state.
 */
export const createSearchErrorState = (error: string): SearchState => ({
  error,
  results: [],
  status: "error",
});

/**
 * @returns The neutral rankings lifecycle state before a destination is selected.
 */
export const createIdleRankingsState = (): RankingsState => ({
  data: null,
  error: null,
  status: "idle",
});

/**
 * @param data Latest rankings data that may remain available while refetching.
 * @returns The loading rankings lifecycle state.
 */
export const createRankingsLoadingState = (
  data: RankedActivitiesResponse | null = null,
): RankingsState => ({
  data,
  error: null,
  status: "loading",
});

/**
 * @param data Rankings payload returned from the API.
 * @returns The successful rankings lifecycle state.
 */
export const createRankingsSuccessState = (
  data: RankedActivitiesResponse,
): RankingsState => ({
  data,
  error: null,
  status: "success",
});

/**
 * @param error Human-readable rankings failure message.
 * @returns The failed rankings lifecycle state.
 */
export const createRankingsErrorState = (error: string): RankingsState => ({
  data: null,
  error,
  status: "error",
});
