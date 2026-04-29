import { transportModeSchema } from "@activity-ranker/shared";
import { defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "#imports";

import { fetchBackendSearchResults } from "../../utils/backend-client";
import { createRequestError } from "../../utils/request-errors";

export const createSearchHandler = (
  getRuntimeConfig = useRuntimeConfig,
  searchLocations = fetchBackendSearchResults,
) =>
  defineEventHandler(async (event) => {
    const query = getQuery(event);
    const locationQuery = String(query.query ?? "").trim();
    const transportResult = transportModeSchema.safeParse(
      query.transport ?? "rest",
    );

    if (locationQuery.length < 3) {
      throw createRequestError(
        400,
        "Query must be at least 3 characters long.",
      );
    }

    if (!transportResult.success) {
      throw createRequestError(400, "Invalid transport mode.");
    }

    const config = getRuntimeConfig(event);
    const apiBaseUrl = config.apiBaseUrl as string | undefined;
    const apiInternalKey = config.apiInternalKey as string | undefined;

    if (!apiBaseUrl || !apiInternalKey) {
      throw createRequestError(500, "Frontend API proxy is not configured.");
    }

    return searchLocations({
      apiBaseUrl,
      internalKey: apiInternalKey,
      query: locationQuery,
      transport: transportResult.data,
    });
  });

export default createSearchHandler();
