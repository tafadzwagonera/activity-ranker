import { randomUUID } from "node:crypto";
import type { H3Event } from "h3";

import {
  createRequestLog,
  headerNames,
  observabilityEventNames,
  resolveStructuredLogLevel,
  resolveStructuredOutcome,
  type RequestLog,
} from "@activity-ranker/shared";

export type ProxyLogger = {
  error: (entry: RequestLog) => void;
  info: (entry: RequestLog) => void;
  warn: (entry: RequestLog) => void;
};

export type ProxyRequestContext = {
  method: string;
  operation: string;
  path: string;
  requestId: string;
  startTimeInMs: number;
  transport: string;
};

const createConsoleLoggerMethod =
  (writer: (message?: unknown, ...optionalParams: unknown[]) => void) =>
  (entry: RequestLog) =>
    writer(JSON.stringify(entry));

export const proxyLogger: ProxyLogger = {
  error: createConsoleLoggerMethod(console.error),
  info: createConsoleLoggerMethod(console.info),
  warn: createConsoleLoggerMethod(console.warn),
};

/**
 * @param event H3 event flowing through the Nuxt server route.
 * @returns Stable request ID for proxy correlation across frontend and backend boundaries.
 */
export const resolveProxyRequestId = (event: H3Event) => {
  const headerValue = event.node.req.headers[headerNames.xRequestId];

  if (typeof headerValue === "string" && headerValue.trim().length > 0) {
    return headerValue;
  }

  return randomUUID();
};

/**
 * @param event H3 event flowing through the Nuxt server route.
 * @param requestId Correlation ID to expose back to the caller.
 * @returns Nothing. The response header is mutated in place.
 */
export const setProxyResponseRequestId = (
  event: H3Event,
  requestId: string,
) => {
  event.node.res.setHeader(headerNames.xRequestId, requestId);
};

/**
 * @param params Context inputs that remain constant for the full proxy request lifecycle.
 * @returns Structured proxy request context used for completion and failure logs.
 */
export const createProxyRequestContext = ({
  event,
  operation,
  transport,
}: {
  event: H3Event;
  operation: string;
  transport: string;
}): ProxyRequestContext => {
  const requestId = resolveProxyRequestId(event);
  const requestUrl = event.node.req.url ?? "/";
  const path = requestUrl.split("?")[0] ?? "/";

  setProxyResponseRequestId(event, requestId);

  return {
    method: event.node.req.method ?? "GET",
    operation,
    path,
    requestId,
    startTimeInMs: Date.now(),
    transport,
  };
};

const writeProxyLog = ({
  context,
  event,
  logger,
  outcome,
  statusCode,
}: {
  context: ProxyRequestContext;
  event: string;
  logger: ProxyLogger;
  outcome: string;
  statusCode: number;
}) => {
  const durationInMs = Math.max(Date.now() - context.startTimeInMs, 0);
  const entry = createRequestLog({
    durationInMs,
    event,
    method: context.method,
    operation: context.operation,
    outcome,
    path: context.path,
    requestId: context.requestId,
    statusCode,
    transport: context.transport,
  });
  const level = resolveStructuredLogLevel(statusCode);

  logger[level](entry);
};

/**
 * @param params Completion log inputs for a successful Nuxt proxy request.
 * @returns Nothing. Writes one structured completion log.
 */
export const logProxyRequestCompleted = ({
  context,
  logger,
  statusCode,
}: {
  context: ProxyRequestContext;
  logger: ProxyLogger;
  statusCode?: number;
}) => {
  writeProxyLog({
    context,
    event: observabilityEventNames.frontendProxyRequestCompleted,
    logger,
    outcome: resolveStructuredOutcome(statusCode ?? 200),
    statusCode: statusCode ?? 200,
  });
};

/**
 * @param params Failure log inputs for a failed Nuxt proxy request.
 * @returns Nothing. Writes one structured failure log.
 */
export const logProxyRequestFailed = ({
  context,
  logger,
  outcome,
  statusCode,
}: {
  context: ProxyRequestContext;
  logger: ProxyLogger;
  outcome: string;
  statusCode: number;
}) => {
  writeProxyLog({
    context,
    event: observabilityEventNames.frontendProxyRequestFailed,
    logger,
    outcome,
    statusCode,
  });
};
