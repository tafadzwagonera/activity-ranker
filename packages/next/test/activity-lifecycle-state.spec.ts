import { describe, expect, it } from "vitest";

import {
  createIdleRankingsState,
  createIdleSearchState,
  createRankingsErrorState,
  createRankingsLoadingState,
  createRankingsSuccessState,
  createSearchErrorState,
  createSearchLoadingState,
  createSearchSuccessState,
} from "../utils/activity-lifecycle-state";

describe("activity lifecycle state helpers", () => {
  it("creates an idle search state with no results or error", () => {
    expect(createIdleSearchState()).toEqual({
      error: null,
      results: [],
      status: "idle",
    });
  });

  it("creates a loading search state while preserving current results", () => {
    const currentResults = [
      {
        admin1: "KwaZulu-Natal",
        country: "South Africa",
        id: 1,
        latitude: -29.8587,
        longitude: 31.0218,
        name: "Durban",
      },
    ];

    expect(createSearchLoadingState(currentResults)).toEqual({
      error: null,
      results: currentResults,
      status: "loading",
    });
  });

  it("creates a success search state with the next results", () => {
    const nextResults = [
      {
        admin1: "KwaZulu-Natal",
        country: "South Africa",
        id: 1,
        latitude: -29.8587,
        longitude: 31.0218,
        name: "Durban",
      },
    ];

    expect(createSearchSuccessState(nextResults)).toEqual({
      error: null,
      results: nextResults,
      status: "success",
    });
  });

  it("creates an error search state with cleared results", () => {
    expect(
      createSearchErrorState("Unable to search for this location."),
    ).toEqual({
      error: "Unable to search for this location.",
      results: [],
      status: "error",
    });
  });

  it("creates rankings states for idle, loading, success, and error", () => {
    const rankings = {
      days: [],
      location: {
        admin1: "KwaZulu-Natal",
        country: "South Africa",
        latitude: -29.8587,
        longitude: 31.0218,
        name: "Durban",
      },
    };

    expect(createIdleRankingsState()).toEqual({
      data: null,
      error: null,
      status: "idle",
    });
    expect(createRankingsLoadingState()).toEqual({
      data: null,
      error: null,
      status: "loading",
    });
    expect(createRankingsSuccessState(rankings)).toEqual({
      data: rankings,
      error: null,
      status: "success",
    });
    expect(
      createRankingsErrorState("Unable to load activity rankings."),
    ).toEqual({
      data: null,
      error: "Unable to load activity rankings.",
      status: "error",
    });
  });
});
