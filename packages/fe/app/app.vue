<template>
  <div>
    <NuxtPage />
  </div>
</template>

<style>
:root {
  --bg: #f6f3ee;
  --surface-1: #ffffff;
  --surface-2: #efebe4;
  --surface-3: #e6e1d8;
  --border: rgba(155, 135, 100, 0.18);
  --border-h: rgba(155, 135, 100, 0.36);
  --gold: #8b6010;
  --gold-dim: rgba(139, 96, 16, 0.1);
  --gold-ring: rgba(139, 96, 16, 0.24);
  --sky: #1a6d94;
  --sky-dim: rgba(26, 109, 148, 0.08);
  --sky-ring: rgba(26, 109, 148, 0.2);
  --text-1: #1c2a38;
  --text-2: #52637a;
  --text-3: #9aaab8;
  --success: #1a7a5a;
  --danger: #b83030;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.08), 0 12px 40px rgba(0, 0, 0, 0.06);
  --radius: 12px;
  --radius-lg: 20px;
}

[data-theme="dark"] {
  --bg: #050b14;
  --surface-1: #0a1520;
  --surface-2: #0e1c2c;
  --surface-3: #132338;
  --border: rgba(74, 157, 196, 0.11);
  --border-h: rgba(74, 157, 196, 0.26);
  --gold: #d4a543;
  --gold-dim: rgba(212, 165, 67, 0.13);
  --gold-ring: rgba(212, 165, 67, 0.3);
  --sky: #4a9dc4;
  --sky-dim: rgba(74, 157, 196, 0.1);
  --sky-ring: rgba(74, 157, 196, 0.22);
  --text-1: #ede8e0;
  --text-2: #8ba4ba;
  --text-3: #3e5368;
  --success: #5cbf9a;
  --danger: #e05252;
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 4px 20px rgba(0, 0, 0, 0.4), 0 12px 40px rgba(0, 0, 0, 0.3);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(180, 140, 60, 0.09), transparent 38%),
    linear-gradient(180deg, rgba(155, 135, 100, 0.06) 0, transparent 30%),
    var(--bg);
  color: var(--text-1);
  font-family: Outfit, system-ui, sans-serif;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(155, 135, 100, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(155, 135, 100, 0.08) 1px, transparent 1px);
  background-size: 56px 56px;
  pointer-events: none;
  z-index: -1;
}

button,
input {
  font: inherit;
}

.focus-ring:focus-visible {
  outline: 2px solid var(--sky);
  outline-offset: 2px;
}
</style>
