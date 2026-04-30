import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import postcssConfig from "../postcss.config.mjs";

describe("postcss config", () => {
  it("uses the Tailwind PostCSS plugin package", () => {
    expect(postcssConfig.plugins).toMatchObject({
      "@tailwindcss/postcss": {},
      autoprefixer: {},
    });
  });

  it("loads Tailwind through the Tailwind 4 CSS entrypoint", () => {
    const globalsCssPath = resolve(import.meta.dirname, "../app/globals.css");
    const globalsCss = readFileSync(globalsCssPath, "utf8");

    expect(globalsCss).toContain('@config "../tailwind.config.js";');
    expect(globalsCss).toContain('@import "tailwindcss";');
  });
});
