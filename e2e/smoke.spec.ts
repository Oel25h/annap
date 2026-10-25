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
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        "href",
        abs(path),
      );

      expect(errors, `console errors on ${url}`).toEqual([]);
    });
  }
}

test("switching language keeps the page and does not reload", async ({ page, isMobile }) => {
  // Below 640 the switch is a row in the menu; above, EN / ΕΛ in the header. Both are named in full.
  const switchTo = async (name: string) => {
    if (isMobile) await page.getByRole("button", { name: /^(Menu|Μενού)$/ }).click();
    await page.getByRole("link", { name, exact: true }).click();
  };
  await page.goto("/about", { waitUntil: "networkidle" });
  await page.evaluate(() => ((window as unknown as { __marker: number }).__marker = 1));

  await switchTo("Ελληνικά");
  await expect(page).toHaveURL(/\/el\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "el");
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);

  await switchTo("English");
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await page.evaluate(() => (window as unknown as { __marker?: number }).__marker)).toBe(1);
});

test("a client-side page change focuses the new page's h1", async ({ page, isMobile }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  if (isMobile) await page.getByRole("button", { name: "Menu", exact: true }).click();
  const gallery = page.getByRole("link", { name: "Gallery", exact: true }).first();
  if (!(await gallery.isVisible())) {
    await page.getByRole("button", { name: "Explore", exact: true }).click();
  }
  await gallery.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.locator("main h1")).toBeFocused();
});

test("the menu opens, closes on Escape and returns focus", async ({ page, isMobile }) => {
  test.skip(!isMobile, "the menu is replaced by the inline nav from 1180px");
  await page.goto("/", { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: "Menu", exact: true });
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator(`[id="${await button.getAttribute("aria-controls")}"]`);
  await expect(panel.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(panel.getByRole("group", { name: "Language" })).toBeVisible();
  await panel.getByRole("link").first().focus();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await expect(button).toBeFocused();
});

test("the footer has one nav and the legal row", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const footer = page.getByRole("contentinfo");
  await expect(footer.getByRole("navigation")).toHaveCount(1);
  await expect(footer.getByRole("navigation", { name: "Footer" })).toBeVisible();
  await expect(footer.getByRole("list", { name: "Legal" })).toBeVisible();
  await expect(footer.getByText("Based in Cyprus")).toBeVisible();
});

// The legal pages hold links typed into rich text, which the server moves to /el.
for (const url of ["/el", "/el/privacy", "/el/terms", "/el/cookies"]) {
  test(`links inside the Greek site stay in Greek: ${url}`, async ({ page }) => {
    await page.goto(url, { waitUntil: "networkidle" });
    const hrefs = await page
      .locator('a[href^="/"]:not([hreflang])')
      .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    const english = hrefs.filter(
      (h) => !h.startsWith("/el") && !/^\/(admin|auth|api)(\/|$)/.test(h) && !/\.\w+$/.test(h),
    );
    expect(english, `internal links on ${url} that point at English pages`).toEqual([]);
  });
}

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
