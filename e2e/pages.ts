import { test, type Page } from "@playwright/test";

/**
 * Every public page the reflow and accessibility specs visit, by its English
 * path; the Greek page is the same path under /el.
 *
 * - `optional`: a page that exists only once it is published; skipped on a 404.
 * - `status`: the status the page answers with (the 404 page).
 * - `from` + `link`: an item page whose rows exist only in some databases, found
 *   as the first matching link on its index page.
 */
export type PublicPage =
  | { name: string; path: string; status?: number; optional?: boolean }
  | { name: string; from: string; link: RegExp; optional?: boolean };

export const PUBLIC_PAGES: PublicPage[] = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "books", path: "/books" },
  { name: "book", path: "/books/find-your-reason-to-smile" },
  { name: "stories", path: "/blog" },
  { name: "story", path: "/blog/the-morning-i-decided-to-keep-going" },
  { name: "gallery", path: "/gallery" },
  { name: "foundation", path: "/foundation" },
  { name: "foundation story", from: "/foundation", link: /^\/foundation\/stories\/[^/?#]+$/ },
  { name: "contact", path: "/contact" },
  { name: "shop", path: "/shop" },
  { name: "product", path: "/shop/find-your-reason-to-smile-companion" },
  { name: "masterclasses", path: "/masterclasses" },
  { name: "masterclass", from: "/masterclasses", link: /^\/masterclasses\/[^/?#]+$/ },
  { name: "events", path: "/events", optional: true },
  { name: "event", from: "/events", link: /^\/events\/[^/?#]+$/, optional: true },
  { name: "videos", path: "/videos", optional: true },
  { name: "press", path: "/press", optional: true },
  { name: "privacy", path: "/privacy" },
  { name: "terms", path: "/terms" },
  { name: "cookies", path: "/cookies" },
  { name: "start", path: "/start" },
  { name: "not found", path: "/this-page-does-not-exist", status: 404 },
];

export const LOCALES = ["en", "el"] as const;
export type Locale = (typeof LOCALES)[number];
export const THEMES = ["light", "dark"] as const;

/** The site's own labels for what the specs look up by name. */
export const LABELS = {
  en: { menu: "Menu", language: "Language", action: "Free eBook" },
  el: { menu: "Μενού", language: "Γλώσσα", action: "Δωρεάν eBook" },
} as const;

export const localePath = (path: string, locale: Locale) =>
  locale === "el" ? (path === "/" ? "/el" : `/el${path}`) : path;

/** How a page reads in a test title: its English path, or the index it is found from. */
export const pageLabel = (entry: PublicPage) =>
  "path" in entry ? entry.path : `${entry.from}/<first ${entry.name}>`;

// Found item paths, kept for the worker's lifetime, or why there is none.
const found = new Map<string, { path?: string; none?: string }>();

async function findItem(page: Page, entry: Extract<PublicPage, { from: string }>) {
  const key = `${entry.from} ${entry.link.source}`;
  if (!found.has(key)) {
    const response = await page.goto(entry.from, { waitUntil: "domcontentloaded" });
    if (response?.status() === 404 && entry.optional) {
      found.set(key, { none: `${entry.from} is not published in this database` });
    } else {
      const hrefs = await page
        .locator("main a[href]")
        .evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
      const path = hrefs.find((href) => entry.link.test(href));
      found.set(key, path ? { path } : { none: `${entry.from} links no ${entry.name} page` });
    }
  }
  return found.get(key)!;
}

/**
 * Opens the page in the locale and waits until it is settled: network idle, web
 * fonts loaded, lazy content pulled in by one scroll to the end and back.
 * Skips the test when an optional or found page does not exist here.
 */
export async function openPage(page: Page, entry: PublicPage, locale: Locale) {
  let path: string;
  if ("from" in entry) {
    const item = await findItem(page, entry);
    test.skip(!item.path, item.none);
    path = item.path!;
  } else {
    path = entry.path;
  }
  const url = localePath(path, locale);
  const response = await page.goto(url, { waitUntil: "networkidle" });
  const status = response?.status();
  const expected = "status" in entry && entry.status ? entry.status : 200;
  test.skip(
    status === 404 && expected !== 404 && !!entry.optional,
    `${url} is not published in this database`,
  );
  if (status !== expected) throw new Error(`${url} answered ${status}, expected ${expected}`);
  await settle(page, { scroll: true });
  return url;
}

/** Waits for fonts and two frames; with `scroll`, first walks the page to load lazy content. */
export async function settle(page: Page, { scroll = false } = {}) {
  await page.evaluate(async (walk) => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    if (walk) {
      for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) {
        scrollTo(0, y);
        await frame();
      }
      scrollTo(0, 0);
    }
    await document.fonts.ready;
    await frame();
    await frame();
  }, scroll);
}

/** The specs set their own viewports, so they run once, in the desktop project. */
export function desktopProjectOnly() {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== "desktop",
      "sets its own viewports; runs in the desktop project only",
    );
  });
}
