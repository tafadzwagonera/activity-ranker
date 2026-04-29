import { describe, expect, it } from "vitest";

import { selectLocation } from "../utils/location-selection";

describe("selectLocation", () => {
  it("accepts the first selected location", () => {
    const result = selectLocation(
      null,
      {
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
      false,
    );

    expect(result.error).toBeNull();
    expect(result.selected?.name).toBe("Cape Town");
  });

  it("rejects selecting a second location in v1", () => {
    const result = selectLocation(
      {
        id: 1,
        latitude: -33.9249,
        longitude: 18.4241,
        name: "Cape Town",
      },
      {
        id: 2,
        latitude: 51.5072,
        longitude: -0.1276,
        name: "London",
      },
      false,
    );

    expect(result.selected?.name).toBe("Cape Town");
    expect(result.error).toContain("Selecting multiple cities or towns");
  });
});
