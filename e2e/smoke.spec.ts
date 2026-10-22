import { expect, test } from "@playwright/test";

/** Every public page, in English and in Greek. Grows as pages are rebuilt. */
const PAGES = [
  "/",
  "/about",
  "/books",
  "/books/find-your-reason-to-smile",
  "/blog",
  "/gallery",
  "/masterclasses",
  "/shop",
  "/foundation",
  "/start",
  "/contact",
];

for (const path of PAGES) {
  for (const locale of ["en", "el"] as const) {
    const url = locale === "el" ? `/el${path === "/" ? "" : path}` : path;

    test(`${url} renders without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(url, { waitUntil: "networkidle" });
      expect(response?.status(), `status for ${url}`).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(errors, `console errors on ${url}`).toEqual([]);
    });
  }
}

test("unknown pages return 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});
