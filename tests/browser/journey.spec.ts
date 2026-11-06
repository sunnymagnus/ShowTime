import { test, expect } from "@playwright/test";
import { dayKeys, showsFor } from "../../shared/catalog";

const show = showsFor(dayKeys()[1])[11];
const showUrl = "/?show=" + encodeURIComponent(show.id);
const seat = (page: any, id: string) =>
  page.getByRole("button", { name: new RegExp("^Seat " + id + ",") });

test("Movie discovery, all cinemas and responsive UI run without internet requests", async ({
  page,
}) => {
  const errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
      external.push(url.href);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Life’s better/ }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll(
          (images) =>
            images.filter(
              (i) =>
                i instanceof HTMLImageElement &&
                (!i.complete || i.naturalWidth === 0),
            ).length,
        ),
    )
    .toBe(0);
  await page.getByLabel("Search movies").fill("Jailer");
  await expect(page.locator(".movie-card")).toHaveCount(1);
  await page
    .locator("header")
    .getByRole("button", { name: "Cinemas", exact: true })
    .click();
  await expect(page.locator(".cinema-card")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Single screen", exact: true })
    .click();
  await expect(page.locator(".cinema-card")).toHaveCount(5);
  await page.getByRole("button", { name: "Multiplex", exact: true }).click();
  await expect(page.locator(".cinema-card")).toHaveCount(5);
  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});

test("Two browsers synchronise selection, deselection and confirmed seats", async ({
  browser,
}) => {
  const a = await browser.newContext(),
    b = await browser.newContext(),
    one = await a.newPage(),
    two = await b.newPage();
  try {
    await Promise.all([
      one.goto("http://localhost:3000" + showUrl),
      two.goto("http://localhost:3000" + showUrl),
    ]);
    await expect(seat(one, "H11")).toBeEnabled();
    await expect(seat(two, "H11")).toBeEnabled();
    await seat(one, "H11").click();
    await expect(seat(two, "H11")).toBeDisabled();
    await seat(one, "H12").click();
    await expect(seat(two, "H12")).toBeDisabled();
    await one.reload();
    await expect(seat(one, "H11")).toHaveAttribute("aria-pressed", "true");
    await seat(one, "H11").click();
    await expect(seat(two, "H11")).toBeEnabled();
    await one
      .getByRole("button", { name: "Release hold", exact: true })
      .click();
    await expect(seat(two, "H12")).toBeEnabled();
    await seat(two, "H11").click();
    await two
      .getByRole("button", { name: "Review booking", exact: true })
      .click();
    await two
      .getByRole("button", {
        name: "Confirm free project booking",
        exact: true,
      })
      .click();
    await expect(two.locator(".booking-ticket")).toHaveCount(1);
    await expect(seat(one, "H11")).toBeDisabled();
    await two
      .getByRole("button", { name: "Cancel booking", exact: true })
      .click();
    await two.getByRole("button", { name: "Yes, cancel", exact: true }).click();
    await expect(seat(one, "H11")).toBeEnabled();
  } finally {
    await a.close();
    await b.close();
  }
});

test("Guest booking includes private QR download, history, watchlist and waiting validation", async ({
  page,
}) => {
  await page.goto(showUrl);
  await expect(seat(page, "A1")).toBeEnabled();
  await seat(page, "A1").click();
  await expect(seat(page, "A1")).toBeEnabled();
  await seat(page, "A2").click();
  await page
    .getByRole("button", { name: "Review booking", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm free project booking", exact: true })
    .click();
  await expect(page.locator(".booking-ticket")).toHaveCount(1);
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download ticket", exact: true })
    .click();
  expect((await download).suggestedFilename()).toMatch(/\.html$/);
  await page
    .getByRole("button", { name: "Cancel booking", exact: true })
    .click();
  await page.getByRole("button", { name: "Yes, cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Past & cancelled", exact: true })
    .click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Save Jailer 2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Remove Jailer 2", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: "Watchlist", exact: true })
    .click();
  await expect(page.locator(".movie-card")).toHaveCount(1);
  await page.goto(showUrl);
  await page
    .getByRole("button", { name: "Join waitlist", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Join waitlist", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: /matching seats available/ }),
  ).toBeVisible();
});

test("Admin uses local login and can cancel and reopen a show", async ({
  page,
}) => {
  await page.goto("/?tab=Studio");
  await expect(
    page.getByRole("heading", { name: "Owner access only." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Admin sign in", exact: true }).click();
  await page.getByLabel("Username", { exact: true }).fill("admin");
  await page.getByLabel("Password", { exact: true }).fill("Showtime@123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Manage show")).toBeVisible();
  await page.getByLabel("Manage date").fill(dayKeys()[1]);
  const value = await page
    .getByLabel("Manage show")
    .locator("option")
    .nth(1)
    .getAttribute("value");
  expect(value).toBeTruthy();
  await page.getByLabel("Manage show").selectOption(value!);
  await page.getByRole("button", { name: "Cancel show", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Yes, cancel", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Show cancelled");
  await page.getByRole("button", { name: "Reopen show", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Show reopened");
  await page.goto("/admin/logout");
  await page.goto("/?tab=Studio");
  await expect(
    page.getByRole("heading", { name: "Owner access only." }),
  ).toBeVisible();
});
