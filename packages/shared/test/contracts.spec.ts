import { describe, expect, it } from "vitest";

import {
  activityIds,
  coordinatesSchema,
  headerNames,
  rankedActivitiesResponseSchema,
  transportModeSchema,
} from "../src/contracts";
import * as sharedExports from "../src/index";

describe("contracts", () => {
  it("validates ranking response shapes", () => {
    const parsed = rankedActivitiesResponseSchema.parse({
      location: {
        name: "Cape Town",
        latitude: -33.9249,
        longitude: 18.4241,
      },
      days: [
        {
          date: "2026-04-26",
          activities: activityIds.map((activity, index) => ({
            activity,
            score: Number((0.9 - index * 0.1).toFixed(2)),
            confidence: 0.8,
            reasons: [],
          })),
        },
      ],
    });

    expect(parsed.days).toHaveLength(1);
  });

  it("rejects invalid coordinates", () => {
    expect(() =>
      coordinatesSchema.parse({
        latitude: 120,
        longitude: 18.4,
      }),
    ).toThrow();
  });

  it("accepts supported transport modes", () => {
    expect(transportModeSchema.parse("rest")).toBe("rest");
    expect(transportModeSchema.parse("graphql")).toBe("graphql");
  });

  it("exports shared headers and schemas for frontend and backend consumers", () => {
    expect(sharedExports.coordinatesSchema).toBe(coordinatesSchema);
    expect(sharedExports.rankedActivitiesResponseSchema).toBe(
      rankedActivitiesResponseSchema,
    );
    expect(sharedExports.headerNames).toEqual(headerNames);
  });
});
