import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{vue,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        "text-1": "var(--text-1)",
        "text-2": "var(--text-2)",
        "text-3": "var(--text-3)",
        border: "var(--border)",
        "border-h": "var(--border-h)",
        sky: "var(--sky)",
        "sky-dim": "var(--sky-dim)",
        "sky-ring": "var(--sky-ring)",
        gold: "var(--gold)",
        "gold-dim": "var(--gold-dim)",
        "gold-ring": "var(--gold-ring)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      boxShadow: {
        DEFAULT: "var(--shadow)",
        lg: "var(--shadow-lg)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius-lg)",
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        serif: ["Cormorant", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
};

export default config;
