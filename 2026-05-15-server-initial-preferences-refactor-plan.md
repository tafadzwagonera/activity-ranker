# Server Initial Preferences Refactor Implementation Plan

**Goal:** Eliminate the theme and transport preference flash by providing initial values from server-readable cookies and synchronizing client updates back to both cookies and local storage.

**Architecture:** Keep the current client UI component, but change its initialization path so `layout.tsx` sets the initial `data-theme` on `<html>` and `page.tsx` passes an initial transport prop into `ActivityRankerClient`. The client component remains responsible for runtime updates and persistence, but it no longer needs a mount-only restoration Effect.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Vitest, Testing Library

---

## File map

- Modify: `packages/next/app/layout.tsx`
  - Read the theme cookie on the server and render `<html data-theme="...">`.
- Modify: `packages/next/app/page.tsx`
  - Read the transport cookie on the server and pass it to the client component.
- Modify: `packages/next/components/activity-ranker-client.tsx`
  - Accept initial preference props, initialize state from props, remove the mount-only restoration Effect, and persist updates to cookies plus local storage.
- Create: `packages/next/test/preference-cookies.spec.tsx`
  - Cover cookie parsing helpers and client persistence behavior for theme/transport updates.

## Tasks

1. Add small server-safe helpers to validate persisted preference values and expose initial theme/transport defaults.
2. Update `layout.tsx` to render the validated initial theme on the `<html>` element during server render.
3. Update `page.tsx` to read the validated transport cookie and pass it into `ActivityRankerClient`.
4. Refactor `ActivityRankerClient` to accept `initialTheme` and `initialTransport`, initialize state from those props, and remove the mount-only local storage restoration Effect.
5. Extend the existing persistence Effects so theme and transport writes update both `localStorage` and `document.cookie`.
6. Add focused tests for the validation helpers and for client-side persistence side effects.
7. Run `nr lint`, `nr format`, `nr typecheck`, and targeted Next tests, then fix any issues.
8. Commit with a Conventional Commit message and push the branch.
