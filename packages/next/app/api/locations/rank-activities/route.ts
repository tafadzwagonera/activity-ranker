import {
  coordinatesSchema,
  transportModeSchema,
} from "@activity-ranker/shared";

import { fetchBackendRankings } from "../../../../server/backend-client";
import {
  createProxyRequestContext,
  logProxyRequestCompleted,
  logProxyRequestFailed,
  proxyLogger,
  type ProxyLogger,
} from "../../../../server/observability";
import { createErrorResponse } from "../../../../server/request-errors";
import { resolveNextRuntimeConfig } from "../../../../utils/dev-runtime-config";

type RuntimeConfig = ReturnType<typeof resolveNextRuntimeConfig>;
type RuntimeConfigLoader = () => RuntimeConfig;

export const createRankActivitiesRouteHandler = (
  loadRuntimeConfig: RuntimeConfigLoader = () =>
    resolveNextRuntimeConfig(process.env),
  loadRankings: typeof fetchBackendRankings = fetchBackendRankings,
  logger: ProxyLogger = proxyLogger,
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
    const transport = transportResult.success
      ? transportResult.data
      : "unknown";
    const requestContext = createProxyRequestContext({
      operation: "rankActivities",
      request,
      transport,
    });

    if (!coordinatesResult.success) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "validation_failed",
        statusCode: 400,
      });
      return createErrorResponse(
        400,
        "Invalid coordinates.",
        requestContext.requestId,
      );
    }

    if (!transportResult.success) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "validation_failed",
        statusCode: 400,
      });
      return createErrorResponse(
        400,
        "Invalid transport mode.",
        requestContext.requestId,
      );
    }

    const runtimeConfig = loadRuntimeConfig();

    if (!runtimeConfig.apiBaseUrl || !runtimeConfig.apiInternalKey) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "proxy_misconfigured",
        statusCode: 500,
      });
      return createErrorResponse(
        500,
        "Frontend API proxy is not configured.",
        requestContext.requestId,
      );
    }

    try {
      const rankings = await loadRankings({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        fetcher: fetch,
        internalKey: runtimeConfig.apiInternalKey,
        latitude: coordinatesResult.data.latitude,
        longitude: coordinatesResult.data.longitude,
        requestId: requestContext.requestId,
        transport: transportResult.data,
      });

      logProxyRequestCompleted({
        context: requestContext,
        logger,
      });

      return Response.json(rankings, {
        headers: { "x-request-id": requestContext.requestId },
      });
    } catch {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "upstream_failed",
        statusCode: 502,
      });
      return createErrorResponse(
        502,
        "Backend request failed.",
        requestContext.requestId,
      );
    }
  };
};

export const GET = createRankActivitiesRouteHandler();
