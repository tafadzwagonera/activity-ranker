import { expect, test } from "@playwright/test";

const mockSuggestions = [
  {
    admin1: "Western Cape",
    country: "South Africa",
    id: 1,
    latitude: -33.9249,
    longitude: 18.4241,
    name: "Cape Town",
  },
  {
    admin1: "England",
    country: "United Kingdom",
    id: 2,
    latitude: 51.5072,
    longitude: -0.1276,
    name: "London",
  },
];

const mockRankings = {
  days: [
    {
      activities: [
        {
          activity: "surfing",
          confidence: 0.91,
          reasons: ["Matched nearby surf spot Muizenberg."],
          score: 0.82,
        },
      ],
      date: "2026-04-29",
    },
  ],
  location: {
    admin1: "Western Cape",
    country: "South Africa",
    latitude: -33.9249,
    longitude: 18.4241,
    name: "Cape Town",
  },
};

test("supports autocomplete, selection limits, transport switching, and theme persistence", async ({
  page,
}) => {
  const rankingRequests: string[] = [];

  await page.route("**/api/locations/search**", async (route) => {
    const url = new URL(route.request().url());

    if (url.searchParams.get("query") === "ErrorTown") {
      await route.fulfill({
        body: JSON.stringify({ statusCode: 500 }),
        contentType: "application/json",
        status: 500,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(mockSuggestions),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.route("**/api/locations/rank-activities**", async (route) => {
    rankingRequests.push(route.request().url());
    await route.fulfill({
      body: JSON.stringify(mockRankings),
      contentType: "application/json",
      status: 200,
    });
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Venture" })).toBeVisible();

  await page.getByPlaceholder("Search for a city or town").fill("Cape");
  await expect(page.getByRole("button", { name: "Cape Town" })).toBeVisible();

  await page.getByRole("button", { name: "Cape Town" }).click();
  await expect(page.getByText("Best activities")).toBeVisible();
  await expect(page.getByText("surfing")).toBeVisible();

  await page.getByRole("button", { name: "London" }).click();
  await expect(
    page.getByText(/Selecting multiple cities or towns is not supported yet/),
  ).toBeVisible();

  await page.getByRole("button", { name: "GraphQL" }).click();
  await expect
    .poll(() => rankingRequests.at(-1) ?? "")
    .toContain("transport=graphql");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible();
});

test("shows a request error when autocomplete fails", async ({ page }) => {
  await page.route("**/api/locations/search**", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ statusCode: 500 }),
      contentType: "application/json",
      status: 500,
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Search for a city or town").fill("ErrorTown");

  await expect(
    page.getByText("Unable to search for this location."),
  ).toBeVisible();
});
