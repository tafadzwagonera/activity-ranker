# Activity Lifecycle State Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Next activity ranker client so the search lifecycle and rankings lifecycle each use a single explicit state object instead of multiple booleans and error strings.

**Architecture:** Keep the component behavior and API interactions intact while replacing scattered async UI state with two discriminated object shapes. Extract small lifecycle helper utilities so transitions are explicit, testable, and reusable from the client component without introducing `useReducer` yet.

**Tech Stack:** React 19, Next.js 16, TypeScript, Vitest

---

## File Map

- Modify: `packages/next/components/activity-ranker-client.tsx`
  Why: Replace multiple search/ranking state atoms with single lifecycle objects and update render conditions.
- Create: `packages/next/utils/activity-lifecycle-state.ts`
  Why: Hold the lifecycle types and small transition helpers for search and rankings.
- Create: `packages/next/test/activity-lifecycle-state.spec.ts`
  Why: Characterize the lifecycle helpers with explicit red-green tests.

### Task 1: Add failing lifecycle helper tests

**Files:**

- Create: `packages/next/test/activity-lifecycle-state.spec.ts`
- Modify later: `packages/next/utils/activity-lifecycle-state.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
    expect(
      createSearchLoadingState([
        {
          admin1: "KwaZulu-Natal",
          country: "South Africa",
          id: "durban",
          latitude: -29.8587,
          longitude: 31.0218,
          name: "Durban",
        },
      ]),
    ).toEqual({
      error: null,
      results: [
        {
          admin1: "KwaZulu-Natal",
          country: "South Africa",
          id: "durban",
          latitude: -29.8587,
          longitude: 31.0218,
          name: "Durban",
        },
      ],
      status: "loading",
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn workspace @activity-ranker/next vitest run packages/next/test/activity-lifecycle-state.spec.ts`
Expected: FAIL because `../utils/activity-lifecycle-state` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
import type {
  LocationSuggestion,
  RankedActivitiesResponse,
} from "@activity-ranker/shared";

export type SearchState = {
  status: "idle" | "loading" | "success" | "error";
  results: LocationSuggestion[];
  error: string | null;
};

export type RankingsState = {
  status: "idle" | "loading" | "success" | "error";
  data: RankedActivitiesResponse | null;
  error: string | null;
};
```

Plus factory helpers for the eight state transitions used by the component.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn workspace @activity-ranker/next vitest run packages/next/test/activity-lifecycle-state.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/next/test/activity-lifecycle-state.spec.ts packages/next/utils/activity-lifecycle-state.ts
git commit -m "test: add lifecycle state helper coverage"
```

### Task 2: Refactor the client component to use lifecycle objects

**Files:**

- Modify: `packages/next/components/activity-ranker-client.tsx`
- Test: `packages/next/test/activity-lifecycle-state.spec.ts`

- [ ] **Step 1: Replace individual search and ranking state atoms**

Use:

```ts
const [searchState, setSearchState] = useState<SearchState>(
  createIdleSearchState(),
);
const [rankingsState, setRankingsState] = useState<RankingsState>(
  createIdleRankingsState(),
);
```

- [ ] **Step 2: Update the search effect**

Use the helper transitions:

```ts
if (query.trim().length < 3) {
  setSearchState(createIdleSearchState());
  return;
}

setSearchState((current) => createSearchLoadingState(current.results));
setSearchState(createSearchSuccessState(nextResults));
setSearchState(createSearchErrorState("Unable to search for this location."));
```

- [ ] **Step 3: Update the rankings effect**

Use the helper transitions:

```ts
if (!selectedLocation) {
  setRankingsState(createIdleRankingsState());
  return;
}

setRankingsState(createRankingsLoadingState());
setRankingsState(createRankingsSuccessState(nextRankings));
setRankingsState(createRankingsErrorState("Unable to load activity rankings."));
```

- [ ] **Step 4: Update render branches**

Replace `searching`, `searchError`, `results`, `loadingRankings`, `rankingError`, and `rankings` checks with `searchState.status`, `searchState.results`, `rankingsState.status`, and `rankingsState.data`.

- [ ] **Step 5: Run targeted verification**

Run: `yarn workspace @activity-ranker/next test:ci`
Expected: PASS

### Task 3: Repository verification and handoff

**Files:**

- Modify: `packages/next/components/activity-ranker-client.tsx`
- Create: `packages/next/utils/activity-lifecycle-state.ts`
- Create: `packages/next/test/activity-lifecycle-state.spec.ts`
- Create: `2026-05-15-activity-lifecycle-state-refactor-plan.md`

- [ ] **Step 1: Run repo-required checks**

Run:

```bash
command -v nr >/dev/null 2>&1 && nr lint
nr format
nr typecheck
```

If `nr` is unavailable, run:

```bash
yarn lint
yarn format
yarn typecheck
```

- [ ] **Step 2: Review git diff**

Run: `git status --short` and `git diff -- packages/next/components/activity-ranker-client.tsx packages/next/utils/activity-lifecycle-state.ts packages/next/test/activity-lifecycle-state.spec.ts 2026-05-15-activity-lifecycle-state-refactor-plan.md`

- [ ] **Step 3: Commit implementation**

```bash
git add packages/next/components/activity-ranker-client.tsx packages/next/utils/activity-lifecycle-state.ts packages/next/test/activity-lifecycle-state.spec.ts 2026-05-15-activity-lifecycle-state-refactor-plan.md
git commit -m "refactor: consolidate activity lifecycle ui state"
```

- [ ] **Step 4: Push and return to source branch**

```bash
git push -u origin refactor/activity-lifecycle-state-objects
git switch master
git status --short --branch
```
