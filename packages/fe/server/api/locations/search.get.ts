import { transportModeSchema } from "@activity-ranker/shared";
import { defineEventHandler, getQuery } from "h3";
import { useRuntimeConfig } from "#imports";

import { fetchBackendSearchResults } from "../../utils/backend-client";
import {
  createProxyRequestContext,
  logProxyRequestCompleted,
  logProxyRequestFailed,
  proxyLogger,
  type ProxyLogger,
} from "../../utils/observability";
import { createRequestError } from "../../utils/request-errors";

export const createSearchHandler = (
  getRuntimeConfig = useRuntimeConfig,
  searchLocations = fetchBackendSearchResults,
  logger: ProxyLogger = proxyLogger,
) =>
  defineEventHandler(async (event) => {
    const query = getQuery(event);
    const locationQuery = String(query.query ?? "").trim();
    const transportResult = transportModeSchema.safeParse(
      query.transport ?? "rest",
    );
    const transport = transportResult.success
      ? transportResult.data
      : "unknown";
    const requestContext = createProxyRequestContext({
      event,
      operation: "searchLocations",
      transport,
    });

    if (locationQuery.length < 3) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "validation_failed",
        statusCode: 400,
      });
      throw createRequestError(
        400,
        "Query must be at least 3 characters long.",
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
      const results = await searchLocations({
        apiBaseUrl,
        internalKey: apiInternalKey,
        query: locationQuery,
        requestId: requestContext.requestId,
        transport: transportResult.data,
      });

      logProxyRequestCompleted({
        context: requestContext,
        logger,
      });

      return results;
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

export default createSearchHandler();
