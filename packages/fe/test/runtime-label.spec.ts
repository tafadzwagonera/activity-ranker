import { describe, expect, it } from "vitest";

import { getRuntimeLabel } from "../utils/runtime-label";

describe("getRuntimeLabel", () => {
  it("labels rest transport", () => {
    expect(getRuntimeLabel("rest")).toBe("REST transport");
  });

  it("labels graphql transport", () => {
    expect(getRuntimeLabel("graphql")).toBe("GraphQL transport");
  });
});
