import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";

/**
 * @param options Request inputs for browser-side rankings lookup.
 * @returns Same-origin proxy request details for the Nuxt server route.
 */
export const buildRankingsRequest = ({
  latitude,
  longitude,
  transport,
}: {
  latitude: number;
  longitude: number;
  transport: TransportMode;
}) => ({
  method: "GET" as const,
  url: `/api/locations/rank-activities?latitude=${latitude}&longitude=${longitude}&transport=${transport}`,
});

/**
 * @param options Request inputs for browser-side location search.
 * @returns Same-origin proxy request details for the Nuxt server route.
 */
export const buildSearchRequest = ({
  query,
  transport,
}: {
  query: string;
  transport: TransportMode;
}) => ({
  method: "GET" as const,
  url: `/api/locations/search?query=${encodeURIComponent(query)}&transport=${transport}`,
});

/**
 * @param options Browser-facing rankings fetch options.
 * @returns Ranked activities from the Nuxt server proxy.
 */
export const fetchRankings = async ({
  fetcher = $fetch,
  latitude,
  longitude,
  transport,
}: {
  fetcher?: typeof $fetch;
  latitude: number;
  longitude: number;
  transport: TransportMode;
}): Promise<RankedActivitiesResponse> => {
  const request = buildRankingsRequest({
    latitude,
    longitude,
    transport,
  });

  return fetcher<RankedActivitiesResponse>(request.url, {
    method: request.method,
  });
};

/**
 * @param options Browser-facing search fetch options.
 * @returns Matching location suggestions from the Nuxt server proxy.
 */
export const fetchSearchResults = async ({
  fetcher = $fetch,
  query,
  transport,
}: {
  fetcher?: typeof $fetch;
  query: string;
  transport: TransportMode;
}): Promise<LocationSuggestion[]> => {
  const request = buildSearchRequest({
    query,
    transport,
  });

  return fetcher<LocationSuggestion[]>(request.url, {
    method: request.method,
  });
};
