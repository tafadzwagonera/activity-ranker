import { describe, expect, it, vi } from "vitest";

const createMockRequest = (path: string) =>
  new Request(`http://localhost:3002${path}`);

describe("/api/locations/rank-activities route", () => {
  it("rejects invalid coordinates", async () => {
    const { createRankActivitiesRouteHandler } =
      await import("../app/api/locations/rank-activities/route");
    const handler = createRankActivitiesRouteHandler(vi.fn(), vi.fn());

    const response = await handler(
      createMockRequest(
        "/api/locations/rank-activities?latitude=181&longitude=18.4241&transport=rest",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Invalid coordinates.",
    });
  });

  it("rejects invalid transport modes", async () => {
    const { createRankActivitiesRouteHandler } =
      await import("../app/api/locations/rank-activities/route");
    const handler = createRankActivitiesRouteHandler(vi.fn(), vi.fn());

    const response = await handler(
      createMockRequest(
        "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=ftp",
      ),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Invalid transport mode.",
    });
  });

  it("rejects missing runtime configuration", async () => {
    const { createRankActivitiesRouteHandler } =
      await import("../app/api/locations/rank-activities/route");
    const handler = createRankActivitiesRouteHandler(
      () => ({ apiBaseUrl: "", apiInternalKey: "" }),
      vi.fn(),
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=rest",
      ),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      message: "Frontend API proxy is not configured.",
    });
  });

  it("forwards GraphQL rankings through the backend client", async () => {
    const mockFetchBackendRankings = vi
      .fn()
      .mockResolvedValue({ days: [], location: {} });
    const { createRankActivitiesRouteHandler } =
      await import("../app/api/locations/rank-activities/route");
    const handler = createRankActivitiesRouteHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendRankings,
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/rank-activities?latitude=-33.9249&longitude=18.4241&transport=graphql",
      ),
    );

    await expect(response.json()).resolves.toEqual({ days: [], location: {} });
    expect(mockFetchBackendRankings).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      fetcher: fetch,
      internalKey: "internal-key",
      latitude: -33.9249,
      longitude: 18.4241,
      transport: "graphql",
    });
  });
});
