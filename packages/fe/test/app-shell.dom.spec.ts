// @vitest-environment happy-dom
import { render, screen } from "@testing-library/vue";
import { describe, expect, it } from "vitest";

import AppShell from "../app/app.vue";

describe("app shell", () => {
  it("renders the Nuxt page outlet", () => {
    render(AppShell, {
      global: {
        stubs: {
          NuxtPage: {
            template: "<div>Mock page</div>",
          },
        },
      },
    });

    expect(screen.getByText("Mock page")).toBeTruthy();
  });
});
