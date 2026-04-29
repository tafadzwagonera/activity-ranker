import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig(async () => ({
  test: {
    exclude: ["test/e2e/**"],
    coverage: {
      all: true,
      include: [
        "app/pages/**/*.vue",
        "composables/**/*.ts",
        "server/**/*.ts",
        "utils/**/*.ts",
      ],
      exclude: ["app/app.vue", "nuxt.config.ts", "playwright.config.ts"],
      provider: "v8",
      reporter: ["text", "json", "lcov"],
      reportsDirectory: "./coverage",
    },
    projects: [
      {
        test: {
          environment: "node",
          exclude: ["test/**/*.dom.spec.ts", "test/e2e/**"],
          include: ["test/*.spec.ts"],
          name: "node",
          setupFiles: ["./test/setup.ts"],
        },
      },
      {
        test: {
          environment: "happy-dom",
          include: ["test/*.dom.spec.ts"],
          name: "dom",
          setupFiles: ["./test/setup.ts"],
        },
      },
    ],
  },
}));
