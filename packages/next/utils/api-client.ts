import type {
  LocationSuggestion,
  RankedActivitiesResponse,
  TransportMode,
} from "@activity-ranker/shared";
import {
  locationSuggestionSchema,
  rankedActivitiesResponseSchema,
} from "@activity-ranker/shared";

const readJsonResponse = async <T>({
  response,
  schema,
}: {
  response: Response;
  schema: { parse: (value: unknown) => T };
}): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}.`);
  }

  return schema.parse(await response.json());
};

/**
 * @param options Request inputs for browser-side rankings lookup.
 * @returns Same-origin proxy request details for the Next route handler.
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
 * @returns Same-origin proxy request details for the Next route handler.
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
 * @returns Ranked activities from the Next proxy.
 */
export const fetchRankings = async ({
  fetcher,
  latitude,
  longitude,
  transport,
}: {
  fetcher: typeof fetch;
  latitude: number;
  longitude: number;
  transport: TransportMode;
}): Promise<RankedActivitiesResponse> => {
  const request = buildRankingsRequest({ latitude, longitude, transport });
  const response = await fetcher(request.url, { method: request.method });
  return readJsonResponse({
    response,
    schema: rankedActivitiesResponseSchema,
  });
};

/**
 * @param options Browser-facing search fetch options.
 * @returns Matching location suggestions from the Next proxy.
 */
export const fetchSearchResults = async ({
  fetcher,
  query,
  transport,
}: {
  fetcher: typeof fetch;
  query: string;
  transport: TransportMode;
}): Promise<LocationSuggestion[]> => {
  const request = buildSearchRequest({ query, transport });
  const response = await fetcher(request.url, { method: request.method });
  return readJsonResponse({
    response,
    schema: locationSuggestionSchema.array(),
  });
};
