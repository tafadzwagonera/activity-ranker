import {
  coordinatesSchema,
  transportModeSchema,
} from "@activity-ranker/shared";
import { defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "#imports";

import { fetchBackendRankings } from "../../utils/backend-client";
import {
  createProxyRequestContext,
  logProxyRequestCompleted,
  logProxyRequestFailed,
  proxyLogger,
  type ProxyLogger,
} from "../../utils/observability";
import { createRequestError } from "../../utils/request-errors";

export const createRankActivitiesHandler = (
  getRuntimeConfig = useRuntimeConfig,
  fetchRankings = fetchBackendRankings,
  logger: ProxyLogger = proxyLogger,
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
    const transport = transportResult.success
      ? transportResult.data
      : "unknown";
    const requestContext = createProxyRequestContext({
      event,
      operation: "rankActivities",
      transport,
    });

    if (!coordinatesResult.success) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "validation_failed",
        statusCode: 400,
      });
      throw createRequestError(
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
      throw createRequestError(
        400,
        "Invalid transport mode.",
        requestContext.requestId,
      );
    }

    const config = getRuntimeConfig(event);
    const apiBaseUrl = config.apiBaseUrl as string | undefined;
    const apiInternalKey = config.apiInternalKey as string | undefined;

    if (!apiBaseUrl || !apiInternalKey) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "proxy_misconfigured",
        statusCode: 500,
      });
      throw createRequestError(
        500,
        "Frontend API proxy is not configured.",
        requestContext.requestId,
      );
    }

    try {
      const rankings = await fetchRankings({
        apiBaseUrl,
        internalKey: apiInternalKey,
        latitude: coordinatesResult.data.latitude,
        longitude: coordinatesResult.data.longitude,
        requestId: requestContext.requestId,
        transport: transportResult.data,
      });

      logProxyRequestCompleted({
        context: requestContext,
        logger,
      });

      return rankings;
    } catch {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "upstream_failed",
        statusCode: 502,
      });
      throw createRequestError(
        502,
        "Backend request failed.",
        requestContext.requestId,
      );
    }
  });

export default createRankActivitiesHandler();
