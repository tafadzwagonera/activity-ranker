/**
 * @param status HTTP status to emit.
 * @param message Short public error description.
 * @param requestId Cross-boundary request correlation ID.
 * @returns JSON response describing the request failure.
 */
export const createErrorResponse = (
  status: number,
  message: string,
  requestId: string,
) =>
  Response.json(
    { message, requestId },
    {
      headers: { "x-request-id": requestId },
      status,
    },
  );
