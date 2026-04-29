import {
  coordinatesSchema,
  transportModeSchema,
} from "@activity-ranker/shared";

import { fetchBackendRankings } from "../../../../server/backend-client";
import { createErrorResponse } from "../../../../server/request-errors";
import { resolveNextRuntimeConfig } from "../../../../utils/dev-runtime-config";

type RuntimeConfig = ReturnType<typeof resolveNextRuntimeConfig>;
type RuntimeConfigLoader = () => RuntimeConfig;

export const createRankActivitiesRouteHandler = (
  loadRuntimeConfig: RuntimeConfigLoader = () =>
    resolveNextRuntimeConfig(process.env),
  loadRankings: typeof fetchBackendRankings = fetchBackendRankings,
) => {
  return async (request: Request) => {
    const url = new URL(request.url);
    const coordinatesResult = coordinatesSchema.safeParse({
      latitude: Number(url.searchParams.get("latitude")),
      longitude: Number(url.searchParams.get("longitude")),
    });
    const transportResult = transportModeSchema.safeParse(
      url.searchParams.get("transport") ?? "rest",
    );

    if (!coordinatesResult.success) {
      return createErrorResponse(400, "Invalid coordinates.");
    }

    if (!transportResult.success) {
      return createErrorResponse(400, "Invalid transport mode.");
    }

    const runtimeConfig = loadRuntimeConfig();

    if (!runtimeConfig.apiBaseUrl || !runtimeConfig.apiInternalKey) {
      return createErrorResponse(500, "Frontend API proxy is not configured.");
    }

    const rankings = await loadRankings({
      apiBaseUrl: runtimeConfig.apiBaseUrl,
      fetcher: fetch,
      internalKey: runtimeConfig.apiInternalKey,
      latitude: coordinatesResult.data.latitude,
      longitude: coordinatesResult.data.longitude,
      transport: transportResult.data,
    });

    return Response.json(rankings);
  };
};

export const GET = createRankActivitiesRouteHandler();
