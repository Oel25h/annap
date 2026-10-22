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

const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const greek = (path: string) => (path === "/" ? "/el" : `/el${path}`);
const abs = (path: string) => `${SITE_URL}${path}`;

for (const path of PAGES) {
  for (const locale of ["en", "el"] as const) {
    const url = locale === "el" ? greek(path) : path;

    test(`${url} renders in ${locale} with correct SEO`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      const response = await page.goto(url, { waitUntil: "networkidle" });
      expect(response?.status(), `status for ${url}`).toBe(200);
      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

      const canonicals = page.locator('link[rel="canonical"]');
      await expect(canonicals).toHaveCount(1);
      await expect(canonicals).toHaveAttribute("href", abs(url));
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        "href",
        abs(path),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="el"]')).toHaveAttribute(
        "href",
        abs(greek(path)),
      );

      expect(errors, `console errors on ${url}`).toEqual([]);
    });
  }
}

test("switching language keeps the page and does not reload", async ({ page, isMobile }) => {
  test.skip(isMobile, "the switcher sits in the mobile menu; covered on desktop");
  await page.goto("/about", { waitUntil: "networkidle" });
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));

  await page.getByRole("link", { name: "ΕΛ", exact: true }).first().click();
  await expect(page).toHaveURL(/\/el\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);

  await page.getByRole("link", { name: "EN", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
});

test("links inside the Greek site stay in Greek", async ({ page }) => {
  await page.goto("/el", { waitUntil: "networkidle" });
  const hrefs = await page
    .locator('a[href^="/"]:not([hreflang])')
    .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
  const english = hrefs.filter(
    (h) => !h.startsWith("/el") && !/^\/(admin|auth|api)(\/|$)/.test(h) && !/\.\w+$/.test(h),
  );
  expect(english, "internal links on /el that point at English pages").toEqual([]);
});

test("unknown pages return 404", async ({ page }) => {
  const response = await page.goto("/this-page-does-not-exist");
  expect(response?.status()).toBe(404);
});

test("sitemap lists both languages with alternates", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain(`<loc>${abs("/about")}</loc>`);
  expect(xml).toContain(`<loc>${abs("/el/about")}</loc>`);
  expect(xml).toContain('hreflang="el"');
});
