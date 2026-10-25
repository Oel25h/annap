import { expect, test, type Page } from "@playwright/test";
import {
  LABELS,
  LOCALES,
  PUBLIC_PAGES,
  THEMES,
  desktopProjectOnly,
  localePath,
  openPage,
  pageLabel,
  settle,
} from "./pages";

/** DESIGN.md §12 Reflow: no horizontal scroll on any page at these widths. */
const WIDTHS = [320, 340, 360, 375, 389, 390, 414, 768, 1024, 1180, 1280, 1440];

desktopProjectOnly();

/**
 * The page's scroll width, and its content width with the body's
 * `overflow-x: clip` lifted: the clip may hide the scrollbar but not the loss,
 * so a box cut off at the edge fails too. When either is past the viewport,
 * the elements that cause it, outside any ancestor that clips or scrolls.
 */
function measure(page: Page) {
  return page.evaluate(() => {
    const vw = innerWidth;
    const root = document.documentElement;
    const scrollWidth = root.scrollWidth;
    const saved = [root.style.overflowX, document.body.style.overflowX] as const;
    root.style.overflowX = document.body.style.overflowX = "visible";
    const contentWidth = root.scrollWidth;
    const restore = () => {
      [root.style.overflowX, document.body.style.overflowX] = saved;
    };
    if (Math.max(scrollWidth, contentWidth) <= vw) {
      restore();
      return { scrollWidth, contentWidth, vw, culprits: [] as string[] };
    }

    const clips = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.overflowX !== "visible" || style.position === "fixed") return true;
      }
      return false;
    };
    const past = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5);
    };
    const name = (el: Element) => {
      const section = el.closest("section, header, footer")?.classList;
      const where = section
        ? `${[...section].find((c) => /^(section-|site-)/.test(c)) ?? ""} `
        : "";
      const classes = [...el.classList]
        .slice(0, 3)
        .map((c) => `.${c}`)
        .join("");
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 32);
      const r = el.getBoundingClientRect();
      return `${where}${el.tagName.toLowerCase()}${classes} [${Math.round(r.left)}–${Math.round(r.right)}px]${text ? ` "${text}"` : ""}`;
    };

    // Where the overflow starts (the outermost box past the edge), then what
    // likely pushes it: text wider than its box, a replaced or empty box, a leaf.
    const starts: string[] = [];
    const causes: string[][] = [[], [], []];
    for (const el of document.body.querySelectorAll("*")) {
      if (!past(el) || clips(el)) continue;
      if (!el.parentElement || !past(el.parentElement)) starts.push(name(el));
      const text =
        getComputedStyle(el).overflowX === "visible" && el.scrollWidth > el.clientWidth + 1;
      const replaced = /^(IMG|IFRAME|VIDEO|CANVAS|SVG|INPUT|SELECT|TEXTAREA)$/i.test(el.tagName);
      if (text) causes[0].push(name(el));
      else if (replaced || el.children.length === 0) causes[1].push(name(el));
      else if (![...el.children].some(past)) causes[2].push(name(el));
    }
    const culprits = [
      ...starts.slice(0, 4).map((s) => `starts at ${s}`),
      ...causes.flatMap((list) => list.slice(0, 2)),
    ].slice(0, 8);
    restore();
    return { scrollWidth, contentWidth, vw, culprits };
  });
}

for (const theme of THEMES) {
  test.describe(`${theme}`, () => {
    test.use({ colorScheme: theme, viewport: { width: 320, height: 568 } });

    for (const entry of PUBLIC_PAGES) {
      for (const locale of LOCALES) {
        const label = localePath(pageLabel(entry), locale);

        test(`${label} has no horizontal scroll from 320 to 1440`, async ({ page }) => {
          const url = await openPage(page, entry, locale);
          for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 800 });
            await settle(page);
            const { scrollWidth, contentWidth, vw, culprits } = await measure(page);
            expect
              .soft(
                Math.max(scrollWidth, contentWidth),
                `${url} at ${width}px overflows; ${culprits.join("; ")}`,
              )
              .toBeLessThanOrEqual(vw);
          }
        });

        // DESIGN.md §12: at 320 the language switch and the Free eBook action
        // stay reachable through the menu.
        test(`${label} at 320 reaches the language switch and Free eBook in the menu`, async ({
          page,
        }) => {
          const url = await openPage(page, entry, locale);
          const t = LABELS[locale];
          const header = page.locator("header.site-header");
          test.skip((await header.count()) === 0, `${url} has no site header`);

          const button = header.getByRole("button", { name: t.menu, exact: true });
          await expect(button, `${url}: the menu button`).toHaveAttribute("aria-expanded", "false");
          await expect(button, `${url}: the menu button`).toBeInViewport({ ratio: 1 });
          await button.click();
          await expect(button).toHaveAttribute("aria-expanded", "true");
          const panel = page.locator(`[id="${await button.getAttribute("aria-controls")}"]`);
          await expect(panel).toBeVisible();

          const targets = [
            ["the language group", panel.getByRole("group", { name: t.language, exact: true })],
            ["the Free eBook action", panel.getByRole("link", { name: t.action, exact: true })],
          ] as const;
          for (const [what, target] of targets) {
            await expect.soft(target, `${url}: ${what} in the menu`).toBeVisible();
            if (!(await target.isVisible())) continue;
            await target.scrollIntoViewIfNeeded();
            await expect.soft(target, `${url}: ${what} inside the viewport`).toBeInViewport({
              ratio: 1,
            });
          }
          const { scrollWidth, contentWidth, vw, culprits } = await measure(page);
          expect
            .soft(
              Math.max(scrollWidth, contentWidth),
              `${url} with the menu open overflows; ${culprits.join("; ")}`,
            )
            .toBeLessThanOrEqual(vw);
        });
      }
    }
  });
}

// DESIGN.md, Hero: the hero ends near 764px, so the player shows above the fold
// at 1440×900. A single full recording has no editions row; the spread is the player.
test.describe("the fold", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const locale of LOCALES) {
    test(`${localePath("/", locale)} shows the player above the fold at 1440×900`, async ({
      page,
    }) => {
      const url = await openPage(page, { name: "home", path: "/" }, locale);
      const box = await page.locator(".listen-band").first().boundingBox();
      expect(box, `${url}: the player`).not.toBeNull();
      expect(box!.y, `${url}: top of the player`).toBeLessThan(900);
    });
  }
});
