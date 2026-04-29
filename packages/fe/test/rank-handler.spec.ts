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

describe("/api/locations/rank-activities handler", () => {
  it("rejects invalid coordinates", async () => {
    const { createRankActivitiesHandler } =
      await import("../server/api/locations/rank-activities.get");
    const handler = createRankActivitiesHandler(vi.fn(), vi.fn());

    await expect(
      handler(
        createMockEvent(
          "/api/locations/rank-activities?latitude=181&longitude=18.4241&transport=rest",
        ),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid coordinates.",
    });
  });

  it("rejects invalid transport modes", async () => {
    const { createRankActivitiesHandler } =
      await import("../server/api/locations/rank-activities.get");
    const handler = createRankActivitiesHandler(vi.fn(), vi.fn());

    await expect(
      handler(
        createMockEvent(
          "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=ftp",
        ),
      ),
    ).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: "Invalid transport mode.",
    });
  });

  it("rejects missing runtime configuration", async () => {
    const { createRankActivitiesHandler } =
      await import("../server/api/locations/rank-activities.get");
    const handler = createRankActivitiesHandler(() => ({}), vi.fn());

    await expect(
      handler(
        createMockEvent(
          "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
        ),
      ),
    ).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: "Frontend API proxy is not configured.",
    });
  });

  it("forwards REST ranking requests through the backend client", async () => {
    const mockFetchBackendRankings = vi
      .fn()
      .mockResolvedValue({ days: [], location: {} });
    const mockLogger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };
    const { createRankActivitiesHandler } =
      await import("../server/api/locations/rank-activities.get");
    const handler = createRankActivitiesHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendRankings,
      mockLogger,
    );

    const event = createMockEvent(
      "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
      { [headerNames.xRequestId]: "request-123" },
    );

    await handler(event);

    expect(mockFetchBackendRankings).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
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
        operation: "rankActivities",
        path: "/api/locations/rank-activities",
        requestId: "request-123",
        statusCode: 200,
        transport: "rest",
      }),
    );
  });

  it("forwards GraphQL ranking requests through the backend client", async () => {
    const mockFetchBackendRankings = vi
      .fn()
      .mockResolvedValue({ days: [], location: {} });
    const { createRankActivitiesHandler } =
      await import("../server/api/locations/rank-activities.get");
    const handler = createRankActivitiesHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendRankings,
    );

    await handler(
      createMockEvent(
        "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql",
        { [headerNames.xRequestId]: "request-graphql-123" },
      ),
    );

    expect(mockFetchBackendRankings).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      requestId: "request-graphql-123",
      transport: "graphql",
    });
  });
});
