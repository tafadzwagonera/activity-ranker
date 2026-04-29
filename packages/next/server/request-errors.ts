/**
 * @param status HTTP status to emit.
 * @param message Short public error description.
 * @returns JSON response describing the request failure.
 */
export const createErrorResponse = (status: number, message: string) =>
  Response.json({ message }, { status });
