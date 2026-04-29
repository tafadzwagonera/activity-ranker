import {
  headerNames,
  type LocationSuggestion,
  type RankedActivitiesResponse,
  type TransportMode,
} from "@activity-ranker/shared";

export type BackendRequest = {
  body?: string;
  method: "GET" | "POST";
  url: string;
};

/**
 * @param internalKey Private backend credential held by the Nuxt server proxy.
 * @returns Auth headers for upstream backend requests made from Nuxt server routes.
 */
export const buildBackendHeaders = (internalKey: string) => ({
  [headerNames.xInternalKey]: internalKey,
});

/**
 * @param options Search request inputs for backend calls.
 * @returns Backend request details for either the REST search route or the GraphQL search query.
 */
export const buildBackendSearchRequest = ({
  apiBaseUrl,
  query,
  transport,
}: {
  apiBaseUrl: string;
  query: string;
  transport: TransportMode;
}): BackendRequest => {
  if (transport === "rest") {
    return {
      method: "GET",
      url: `${apiBaseUrl}/locations/search?query=${encodeURIComponent(query)}`,
    };
  }

  return {
    body: JSON.stringify({
      query: `
        query SearchLocations($query: String!) {
          searchLocations(query: $query) {
            id
            name
            latitude
            longitude
            country
            admin1
          }
        }
      `,
      variables: { query },
    }),
    method: "POST",
    url: `${apiBaseUrl}/graphql`,
  };
};

/**
 * @param options Rankings request inputs for backend calls.
 * @returns Backend request details for either the REST ranking route or the GraphQL ranking query.
 */
export const buildBackendRankingsRequest = ({
  apiBaseUrl,
  latitude,
  longitude,
  transport,
}: {
  apiBaseUrl: string;
  latitude: number;
  longitude: number;
  transport: TransportMode;
}): BackendRequest => {
  if (transport === "rest") {
    return {
      method: "GET",
      url: `${apiBaseUrl}/locations/${latitude}/${longitude}/rank-activities`,
    };
  }

  return {
    body: JSON.stringify({
      query: `
        query RankActivities($input: CoordinatesInput!) {
          rankActivitiesByCoordinates(input: $input) {
            location {
              name
              latitude
              longitude
              country
              admin1
            }
            days {
              date
              activities {
                activity
                score
                confidence
                reasons
              }
            }
          }
        }
      `,
      variables: {
        input: {
          latitude,
          longitude,
        },
      },
    }),
    method: "POST",
    url: `${apiBaseUrl}/graphql`,
  };
};

/**
 * @param options Server-side search fetch options.
 * @returns Location suggestions from the backend, regardless of whether the frontend selected REST or GraphQL.
 */
export const fetchBackendSearchResults = async ({
  apiBaseUrl,
  fetcher = $fetch,
  internalKey,
  query,
  transport,
}: {
  apiBaseUrl: string;
  fetcher?: typeof $fetch;
  internalKey: string;
  query: string;
  transport: TransportMode;
}): Promise<LocationSuggestion[]> => {
  const headers = buildBackendHeaders(internalKey);
  const request = buildBackendSearchRequest({
    apiBaseUrl,
    query,
    transport,
  });

  if (transport === "rest") {
    return fetcher<LocationSuggestion[]>(request.url, {
      headers,
      method: request.method,
    });
  }

  const response = await fetcher<{
    data: { searchLocations: LocationSuggestion[] };
  }>(request.url, {
    body: request.body,
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    method: request.method,
  });

  return response.data.searchLocations;
};

/**
 * @param options Server-side rankings fetch options.
 * @returns Ranked activities from the backend, normalized from either transport into the shared response contract.
 */
export const fetchBackendRankings = async ({
  apiBaseUrl,
  fetcher = $fetch,
  internalKey,
  latitude,
  longitude,
  transport,
}: {
  apiBaseUrl: string;
  fetcher?: typeof $fetch;
  internalKey: string;
  latitude: number;
  longitude: number;
  transport: TransportMode;
}): Promise<RankedActivitiesResponse> => {
  const headers = buildBackendHeaders(internalKey);
  const request = buildBackendRankingsRequest({
    apiBaseUrl,
    latitude,
    longitude,
    transport,
  });

  if (transport === "rest") {
    return fetcher<RankedActivitiesResponse>(request.url, {
      headers,
      method: request.method,
    });
  }

  const response = await fetcher<{
    data: { rankActivitiesByCoordinates: RankedActivitiesResponse };
  }>(request.url, {
    body: request.body,
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    method: request.method,
  });

  return response.data.rankActivitiesByCoordinates;
};
