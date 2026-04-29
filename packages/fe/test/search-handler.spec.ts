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
    const { createSearchHandler } =
      await import("../server/api/locations/search.get");
    const handler = createSearchHandler(
      () => ({
        apiBaseUrl: "http://localhost:3000",
        apiInternalKey: "internal-key",
      }),
      mockFetchBackendSearchResults,
    );

    const result = await handler(
      createMockEvent("/api/locations/search?query=Cape%20Town&transport=rest"),
    );

    expect(result).toEqual([{ id: 1, name: "Cape Town" }]);
    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      query: "Cape Town",
      transport: "rest",
    });
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
      ),
    );

    expect(mockFetchBackendSearchResults).toHaveBeenCalledWith({
      apiBaseUrl: "http://localhost:3000",
      internalKey: "internal-key",
      query: "Cape Town",
      transport: "graphql",
    });
  });
});
