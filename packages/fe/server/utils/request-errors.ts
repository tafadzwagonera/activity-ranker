import { createError } from "h3";

/**
 * @param statusCode HTTP status to emit.
 * @param statusMessage Short public error description.
 * @returns H3 error for request validation failures.
 */
export const createRequestError = (statusCode: number, statusMessage: string) =>
  createError({
    statusCode,
    statusMessage,
  });
