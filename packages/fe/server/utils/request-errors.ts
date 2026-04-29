import { createError } from "h3";

/**
 * @param statusCode HTTP status to emit.
 * @param statusMessage Short public error description.
 * @param requestId Cross-boundary request correlation ID.
 * @returns H3 error for request validation failures.
 */
export const createRequestError = (
  statusCode: number,
  statusMessage: string,
  requestId: string,
) =>
  createError({
    data: { requestId },
    statusCode,
    statusMessage,
  });
