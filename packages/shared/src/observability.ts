import { z } from "zod";

export const observabilityEventNames = {
  backendRequestCompleted: "backend_request_completed",
  backendRequestException: "backend_request_exception",
  backendRequestFailed: "backend_request_failed",
  frontendProxyRequestCompleted: "frontend_proxy_request_completed",
  frontendProxyRequestFailed: "frontend_proxy_request_failed",
} as const;

export const requestLogSchema = z.object({
  durationInMs: z.number().min(0),
  event: z.string(),
  method: z.string(),
  outcome: z.string().optional(),
  operation: z.string().optional(),
  path: z.string(),
  provider: z.string().optional(),
  requestId: z.string(),
  statusCode: z.number(),
  transport: z.string(),
});

export type RequestLog = z.infer<typeof requestLogSchema>;
export type StructuredLogLevel = "error" | "info" | "warn";

/**
 * @param statusCode HTTP status attached to the request lifecycle event.
 * @returns Stable severity mapping for structured request logs.
 */
export const resolveStructuredLogLevel = (
  statusCode: number,
): StructuredLogLevel => {
  if (statusCode >= 500) {
    return "error";
  }

  if (statusCode >= 400) {
    return "warn";
  }

  return "info";
};

/**
 * @param statusCode HTTP status attached to the request lifecycle event.
 * @returns Stable request outcome label suitable for log-derived metrics.
 */
export const resolveStructuredOutcome = (statusCode: number) => {
  if (statusCode >= 500) {
    return "server_error";
  }

  if (statusCode >= 400) {
    return "client_error";
  }

  return "success";
};

/**
 * @param params Request log properties that vary by event.
 * @returns Structured request log entry aligned across frontend and backend boundaries.
 */
export const createRequestLog = ({
  durationInMs,
  event,
  method,
  operation,
  outcome,
  path,
  provider,
  requestId,
  statusCode,
  transport,
}: RequestLog): RequestLog => ({
  durationInMs,
  event,
  method,
  operation,
  outcome,
  path,
  provider,
  requestId,
  statusCode,
  transport,
});
