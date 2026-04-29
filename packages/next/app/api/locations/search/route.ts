import { transportModeSchema } from "@activity-ranker/shared";

import { fetchBackendSearchResults } from "../../../../server/backend-client";
import { createErrorResponse } from "../../../../server/request-errors";
import { resolveNextRuntimeConfig } from "../../../../utils/dev-runtime-config";

type RuntimeConfig = ReturnType<typeof resolveNextRuntimeConfig>;
type RuntimeConfigLoader = () => RuntimeConfig;

export const createSearchRouteHandler = (
  loadRuntimeConfig: RuntimeConfigLoader = () =>
    resolveNextRuntimeConfig(process.env),
  loadSearchResults: typeof fetchBackendSearchResults = fetchBackendSearchResults,
) => {
  return async (request: Request) => {
    const url = new URL(request.url);
    const locationQuery = url.searchParams.get("query")?.trim() ?? "";
    const transportResult = transportModeSchema.safeParse(
      url.searchParams.get("transport") ?? "rest",
    );

    if (locationQuery.length < 3) {
      return createErrorResponse(
        400,
        "Query must be at least 3 characters long.",
      );
    }

    if (!transportResult.success) {
      return createErrorResponse(400, "Invalid transport mode.");
    }

    const runtimeConfig = loadRuntimeConfig();

    if (!runtimeConfig.apiBaseUrl || !runtimeConfig.apiInternalKey) {
      return createErrorResponse(500, "Frontend API proxy is not configured.");
    }

    const results = await loadSearchResults({
      apiBaseUrl: runtimeConfig.apiBaseUrl,
      fetcher: fetch,
      internalKey: runtimeConfig.apiInternalKey,
      query: locationQuery,
      transport: transportResult.data,
    });

    return Response.json(results);
  };
};

export const GET = createSearchRouteHandler();
