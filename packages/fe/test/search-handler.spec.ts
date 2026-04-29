import { createEvent } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it, vi } from "vitest";
import { headerNames } from "@activity-ranker/shared";

const createMockEvent = (url: string, headers: Record<string, string> = {}) => {
  const request = new IncomingMessage(new Socket());
  request.method = "GET";
  request.url = url;
  Object.entries(headers).forEach(([name, value]) => {
    request.headers[name] = value;
  });
  const response = new ServerResponse(request);
  return createEvent(request, response);
};

describe("/api/locations/search handler", () => {
  it("rejects too-short search queries", async () => {
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(vi.fn(), vi.fn());

    await expect(
      handler(createMockEvent("/api/locations/search?query=Ca")),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Query must be at least 3 characters long.",
    });
  });

  it("rejects invalid transport modes", async () => {
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(vi.fn(), vi.fn());

    await expect(
      handler(
        createMockEvent(
          "/api/locations/search?query=Cape%20Town&transport=ftp",
        ),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid transport mode.",
    });
  });

  it("rejects missing runtime configuration", async () => {
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(() => ({}), vi.fn());

    await expect(
      handler(
        createMockEvent(
          "/api/locations/search?query=Cape%20Town&transport=rest",
        ),
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Frontend API proxy is not configured.",
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
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendSearchResults,
      mockLogger,
    );

    const event = createMockEvent(
      "/api/locations/search?query=Cape%20Town&transport=rest",
      { [headerNames.xRequestId]: "request-123" },
    );
    const result = await handler(event);

    expect(result).toEqual([{ id: 1, name: "Cape Town" }]);
    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      query: "Cape Town",
      requestId: "request-123",
      transport: "rest",
    });
    expect(event.node.res.getHeader(headerNames.xRequestId)).toBe(
      "request-123",
    );
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

  it("forwards GraphQL searches through the backend client", async () => {
    const mockFetchBackendSearchResults = vi
      .fn()
      .mockResolvedValue([{ id: 1, name: "Cape Town" }]);
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendSearchResults,
    );

    await handler(
      createMockEvent(
        "/api/locations/search?query=Cape%20Town&transport=graphql",
        { [headerNames.xRequestId]: "request-graphql-123" },
      ),
    );

    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      query: "Cape Town",
      requestId: "request-graphql-123",
      transport: "graphql",
    });
  });

  it("returns sanitized request-aware proxy errors", async () => {
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      vi.fn().mockRejectedValue(new Error("socket hang up")),
      mockLogger,
    );
    const event = createMockEvent(
      "/api/locations/search?query=Cape%20Town&transport=rest",
      { [headerNames.xRequestId]: "request-456" },
    );

    await expect(handler(event)).rejects.toMatchObject({
      data: { requestId: "request-456" },
      statusCode: 502,
      statusMessage: "Backend request failed.",
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
