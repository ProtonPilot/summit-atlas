const { test, expect } = require("@playwright/test");

test("homepage loads, resort selection works, and detail page opens", async ({ page, context }) => {
  await page.goto("/index.html");

  await expect(page).toHaveTitle(/Summit Atlas/i);
  await expect(page.getByRole("heading", { name: /endless winter - endless fun/i })).toBeVisible();
  await expect(page.locator("#globe canvas")).toBeVisible();

  await page.locator("#resort-search").fill("Whistler");
  await page.locator("#search-results").getByRole("button", { name: /whistler blackcomb/i }).click();
  await expect(page.locator("#popup-card")).not.toHaveClass(/is-hidden/);
  await expect(page.locator("#popup-content")).toContainText("Whistler Blackcomb");
  await expect(page.locator("#popup-content")).toContainText("Snowiest month");

  const detailLink = page.getByRole("link", { name: /open resort page/i });
  await expect(detailLink).toHaveAttribute("target", "_blank");

  const detailPagePromise = context.waitForEvent("page");
  await detailLink.click();
  const detailPage = await detailPagePromise;
  await detailPage.waitForLoadState("domcontentloaded");

  await expect(detailPage).toHaveURL(/resort\.html\?id=whistler-blackcomb/i);
  await expect(detailPage.getByRole("heading", { name: /whistler blackcomb/i })).toBeVisible();
  await expect(detailPage.locator("body")).toContainText("Snowiest month");
});

test("rotation toggle updates pressed state", async ({ page }) => {
  await page.goto("/index.html");

  const rotationToggle = page.locator("#rotation-toggle");
  await expect(rotationToggle).toHaveAttribute("aria-pressed", "false");
  await expect(rotationToggle).toHaveText(/start rotation/i);

  await rotationToggle.click();
  await expect(rotationToggle).toHaveAttribute("aria-pressed", "true");
  await expect(rotationToggle).toHaveText(/stop rotation/i);

  await rotationToggle.click();
  await expect(rotationToggle).toHaveAttribute("aria-pressed", "false");
  await expect(rotationToggle).toHaveText(/start rotation/i);
});

test("search narrows results and opens the matching resort", async ({ page }) => {
  await page.goto("/index.html");

  const searchInput = page.locator("#resort-search");
  await searchInput.fill("Niseko");

  const searchResults = page.locator("#search-results");
  await expect(searchResults).toContainText("Niseko United");

  await searchResults.getByRole("button", { name: /niseko united/i }).click();
  await expect(page.locator("#popup-content")).toContainText("Niseko United");
  await expect(page.locator("#popup-content")).toContainText("Hokkaido, Japan");
});

test("unknown resort id shows the not-found detail page", async ({ page }) => {
  await page.goto("/resort.html?id=missing-resort");

  await expect(page.getByRole("heading", { name: /that mountain is not in the current directory/i })).toBeVisible();
  await expect(page.locator("body")).toContainText("Resort not found");
  await expect(page.getByRole("link", { name: /back to summit atlas/i })).toBeVisible();
});
