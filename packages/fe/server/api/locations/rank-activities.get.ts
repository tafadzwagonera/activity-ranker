import {
  coordinatesSchema,
  transportModeSchema,
} from "@activity-ranker/shared";
import { defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "#imports";

import { fetchBackendRankings } from "../../utils/backend-client";
import { createRequestError } from "../../utils/request-errors";

export const createRankActivitiesHandler = (
  getRuntimeConfig = useRuntimeConfig,
  fetchRankings = fetchBackendRankings,
) =>
  defineEventHandler(async (event) => {
    const query = getQuery(event);
    const coordinatesResult = coordinatesSchema.safeParse({
      latitude: Number(query.latitude),
      longitude: Number(query.longitude),
    });
    const transportResult = transportModeSchema.safeParse(
      query.transport ?? "rest",
    );

    if (!coordinatesResult.success) {
      throw createRequestError(400, "Invalid coordinates.");
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

    return fetchRankings({
      apiBaseUrl,
      internalKey: apiInternalKey,
      latitude: coordinatesResult.data.latitude,
      longitude: coordinatesResult.data.longitude,
      transport: transportResult.data,
    });
  });

export default createRankActivitiesHandler();
