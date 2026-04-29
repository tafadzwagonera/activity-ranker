import { createEvent } from "h3";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { describe, expect, it, vi } from "vitest";

const createMockEvent = (url: string) => {
  const request = new IncomingMessage(new Socket());
  request.method = "GET";
  request.url = url;
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
        "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
      ),
    );

    expect(mockFetchBackendRankings).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "rest",
    });
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
      ),
    );

    expect(mockFetchBackendRankings).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });
  });
});
