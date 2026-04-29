import { describe, expect, it, vi } from "vitest";
import { headerNames } from "@activity-ranker/shared";

const createMockRequest = (
  path: string,
  headers: Record<string, string> = {},
) =>
  new Request(`http://localhost:3002${path}`, {
    headers,
  });

describe("/api/locations/search route", () => {
  it("rejects too-short search queries", async () => {
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(vi.fn(), vi.fn());

    const response = await handler(
      createMockRequest("/api/locations/search?query=Ca"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Query must be at least 3 characters long.",
    });
  });

  it("rejects invalid transport modes", async () => {
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(vi.fn(), vi.fn());

    const response = await handler(
      createMockRequest(
        "/api/locations/search?query=Cape%20Town&transport=ftp",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Invalid transport mode.",
    });
  });

  it("rejects missing runtime configuration", async () => {
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(
      () => ({ apiBaseUrl: "", apiInternalKey: "" }),
      vi.fn(),
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/search?query=Cape%20Town&transport=rest",
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "Frontend API proxy is not configured.",
    });
  });

  it("forwards REST searches through the backend client", async () => {
    const mockFetchBackendSearchResults = vi
      .fn()
      .mockResolvedValue([{ id: 1, name: "Cape Town" }]);
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendSearchResults,
      mockLogger,
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/search?query=Cape%20Town&transport=rest",
        {
          [headerNames.xRequestId]: "request-123",
        },
      ),
    );

    await expect(response.json()).resolves.toEqual([
      { id: 1, name: "Cape Town" },
    ]);
    expect(response.headers.get(headerNames.xRequestId)).toBe("request-123");
    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      fetcher: fetch,
      internalKey: "internal-key",
      query: "Cape Town",
      requestId: "request-123",
      transport: "rest",
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "frontend_proxy_request_completed",
        method: "GET",
        operation: "searchLocations",
        path: "/api/locations/search",
        requestId: "request-123",
        statusCode: 200,
        transport: "rest",
      }),
    );
  });

  it("returns sanitized request-aware proxy errors", async () => {
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      vi.fn().mockRejectedValue(new Error("socket hang up")),
      mockLogger,
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/search?query=Cape%20Town&transport=rest",
        {
          [headerNames.xRequestId]: "request-456",
        },
      ),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      message: "Backend request failed.",
      requestId: "request-456",
    });
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "frontend_proxy_request_failed",
        operation: "searchLocations",
        requestId: "request-456",
        statusCode: 502,
        transport: "rest",
      }),
    );
  });
});
