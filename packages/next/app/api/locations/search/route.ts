import { transportModeSchema } from "@activity-ranker/shared";

import { fetchBackendSearchResults } from "../../../../server/backend-client";
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

export const createSearchRouteHandler = (
  loadRuntimeConfig: RuntimeConfigLoader = () =>
    resolveNextRuntimeConfig(process.env),
  loadSearchResults: typeof fetchBackendSearchResults = fetchBackendSearchResults,
  logger: ProxyLogger = proxyLogger,
) => {
  return async (request: Request) => {
    const url = new URL(request.url);
    const locationQuery = url.searchParams.get("query")?.trim() ?? "";
    const transportResult = transportModeSchema.safeParse(
      url.searchParams.get("transport") ?? "rest",
    );
    const transport = transportResult.success
      ? transportResult.data
      : "unknown";
    const requestContext = createProxyRequestContext({
      operation: "searchLocations",
      request,
      transport,
    });

    if (locationQuery.length < 3) {
      logProxyRequestFailed({
        context: requestContext,
        logger,
        outcome: "validation_failed",
        statusCode: 400,
      });
      return createErrorResponse(
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
      const results = await loadSearchResults({
        apiBaseUrl: runtimeConfig.apiBaseUrl,
        fetcher: fetch,
        internalKey: runtimeConfig.apiInternalKey,
        query: locationQuery,
        requestId: requestContext.requestId,
        transport: transportResult.data,
      });

      logProxyRequestCompleted({
        context: requestContext,
        logger,
      });

      return Response.json(results, {
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

export const GET = createSearchRouteHandler();
