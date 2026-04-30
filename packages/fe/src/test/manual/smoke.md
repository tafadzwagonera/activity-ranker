# Manual Smoke Tests — @activity-ranker/fe

Start the app: `yarn dev` (runs on http://localhost:3001)

---

## 1. Light theme — baseline colours

**Steps:**

1. Open http://localhost:3001 in a browser.
2. Confirm no dark-mode attribute is set on `<html>`.

**Expected:**

- Page background is warm cream (`#f6f3ee`).
- Hero heading "Venture" renders in Cormorant serif font.
- Sky-coloured accents (teal, `#1a6d94`) appear on transport-button focus rings.
- Gold tokens (`#8b6010`) are visible on the city tag and pill once a location is selected.

---

## 2. Dark theme — toggle and palette

**Steps:**

1. Click the theme-toggle button (moon SVG icon in light mode).
2. Confirm `data-theme="dark"` is set on `<html>`.
3. Refresh the page.

**Expected:**

- Page background switches to deep navy (`#050b14`).
- Toggle now shows a sun SVG icon.
- After refresh, dark theme is restored from localStorage.

---

## 3. Search — suggestions with dropIn animation

**Steps:**

1. Click the search input.
2. Type three or more characters (e.g. "Cap").

**Expected:**

- Suggestion list appears below the input.
- The list entrance plays the `dropIn` animation (slides in from above with a subtle scale).
- Each suggestion shows a city name and meta row (region/country in monospace font).

---

## 4. Location selection — city tag with tagIn animation

**Steps:**

1. With suggestions visible, click any result.

**Expected:**

- The city tag appears in the selection row above the input.
- Tag entrance plays the `tagIn` animation (scales in from 0.88).
- Tag has gold border, gold-dim background, and shows the city name.
- Clicking × on the tag clears the selection.

---

## 5. Rankings load — skeleton shimmer then fadeUp cards

**Steps:**

1. Select a location.
2. Observe loading state, then wait for rankings.

**Expected:**

- Three shimmer skeleton cards appear immediately (gradient sweeps left–right).
- Once rankings arrive, day cards replace skeletons with a `fadeUp` animation.
- Second and third cards are staggered (0.08 s and 0.16 s delay).
- Each card lists activities with score pill and confidence label.

---

## 6. Theme toggle — SVG icons

**Steps:**

1. In light mode, inspect the toggle button.
2. Switch to dark mode, inspect again.

**Expected:**

- Light mode: toggle shows a moon SVG path (`d="M21 12.79…"`).
- Dark mode: toggle shows a sun SVG with circle and ray lines.
- No text strings "Moon" or "Sun" are visible.

---

## 7. Transport toggle — REST ↔ GraphQL

**Steps:**

1. Click "GraphQL" in the transport switch.
2. Select a location to trigger rankings fetch.
3. Refresh the page.

**Expected:**

- Active button highlights (surface-1 background, sky text colour).
- Rankings load via the GraphQL route.
- After refresh, selected transport is restored from localStorage.

---

## 8. Responsive — 720 px breakpoint

**Steps:**

1. Set browser width to ≤ 720 px (DevTools).

**Expected:**

- Activity rows switch from row to column layout.
- Score pill and confidence label align left (not right).
- Theme toggle moves down from `top: 0` to `top: 0.5 rem`.

---

## 9. Body — cartographic grid

**Steps:**

1. Open DevTools → Elements → inspect `<body>::before`.

**Expected:**

- `body::before` is present with a 56 × 56 px grid pattern.
- The grid is faint (warm brown at 8 % opacity).
- `pointer-events: none` and `z-index: -1` are set.

---

## 10. Focus rings — keyboard navigation

**Steps:**

1. Tab through the page without using a mouse.

**Expected:**

- Every focusable element (buttons, input) shows a 2 px solid sky-coloured outline.
- No focus styles are missing on the transport buttons, theme toggle, or suggestion buttons.
