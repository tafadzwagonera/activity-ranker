import { describe, expect, it, vi } from "vitest";

const createMockRequest = (path: string) =>
  new Request(`http://localhost:3002${path}`);

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
    const { createSearchRouteHandler } =
      await import("../app/api/locations/search/route");
    const handler = createSearchRouteHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendSearchResults,
    );

    const response = await handler(
      createMockRequest(
        "/api/locations/search?query=Cape%20Town&transport=rest",
      ),
    );

    await expect(response.json()).resolves.toEqual([
      { id: 1, name: "Cape Town" },
    ]);
    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      fetcher: fetch,
      internalKey: "internal-key",
      query: "Cape Town",
      transport: "rest",
    });
  });
});
