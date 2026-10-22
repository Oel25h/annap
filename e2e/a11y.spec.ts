import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  LOCALES,
  PUBLIC_PAGES,
  THEMES,
  desktopProjectOnly,
  localePath,
  openPage,
  pageLabel,
} from "./pages";

/** WCAG 2.1 AA, plus 2.2 AA's target size (DESIGN.md §12 targets 2.2 AA). */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1440, height: 900 },
];
/** Chromium's roles for controls a user operates, which all need a name. */
const CONTROL_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "DisclosureTriangle",
  "listbox",
  "menuitemcheckbox",
  "menuitemradio",
  "PopUpButton",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "textbox",
]);

desktopProjectOnly();

type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
type Violation = AxeResults["violations"][number];

/** One line per rule: its nodes by selector, with the measured pair for contrast. */
function describeViolation(violation: Violation) {
  const nodes = violation.nodes.slice(0, 6).map((node) => {
    const target = node.target.join(" ");
    const data = node.any.find((check) => check.id === "color-contrast")?.data as
      | {
          fgColor?: string;
          bgColor?: string;
          contrastRatio?: number;
          expectedContrastRatio?: string;
        }
      | undefined;
    return data?.contrastRatio
      ? `${target} (${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1, needs ${data.expectedContrastRatio})`
      : target;
  });
  const more = violation.nodes.length > 6 ? ` and ${violation.nodes.length - 6} more` : "";
  return `${violation.id} (${violation.impact}): ${violation.help}: ${nodes.join(", ")}${more}`;
}

/** Headings, main landmarks, images and current links, as a screen reader meets them. */
function readStructure(page: Page) {
  return page.evaluate(() => {
    const exposed = (el: Element) =>
      el.checkVisibility({ visibilityProperty: true }) &&
      !el.closest("[aria-hidden='true'], [inert], [hidden]");
    const name = (el: Element) => {
      const classes = [...el.classList]
        .slice(0, 3)
        .map((c) => `.${c}`)
        .join("");
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 48);
      return `${el.tagName.toLowerCase()}${classes}${text ? ` "${text}"` : ""}`;
    };
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading']")]
      .filter((el) => exposed(el) && !/^(none|presentation)$/.test(el.getAttribute("role") ?? ""))
      .map((el) => ({
        level: Number(
          el.getAttribute("aria-level") ?? (/^H\d$/.test(el.tagName) ? el.tagName[1] : 2),
        ),
        inMain: !!el.closest("main"),
        name: name(el),
      }));
    const skips: string[] = [];
    headings.reduce(
      (prev, heading) => {
        if (heading.inMain && heading.level > prev.level + 1) {
          skips.push(
            `${prev.level ? `${prev.name} (h${prev.level})` : "page start"} → ${heading.name} (h${heading.level})`,
          );
        }
        return heading;
      },
      { level: 0, inMain: false, name: "" },
    );
    // aria-current="page" names this page, or the section it belongs to, in this
    // language: never a jump to an anchor, never the other language.
    const greek = (path: string) => /^\/el(\/|$)/.test(path);
    const strip = (path: string) => path.replace(/^\/el(?=\/|$)/, "") || "/";
    const here = strip(location.pathname);
    const wrongCurrent = [...document.querySelectorAll("a[aria-current='page'][href]")]
      .filter((a) => {
        const url = new URL(a.getAttribute("href")!, location.href);
        const there = strip(url.pathname);
        return (
          url.origin !== location.origin ||
          !!url.hash ||
          greek(url.pathname) !== greek(location.pathname) ||
          !(there === here || (there !== "/" && here.startsWith(`${there}/`)))
        );
      })
      .map((a) => `${name(a)} → ${a.getAttribute("href")}`);
    return {
      wrongCurrent: [...new Set(wrongCurrent)],
      h1s: headings.filter((h) => h.level === 1).map((h) => h.name),
      mains: [...document.querySelectorAll("main, [role='main']")].filter(exposed).length,
      skips,
      imagesWithoutAlt: [...document.querySelectorAll("img:not([alt])")].map(
        (img) => `${name(img)} src=${img.getAttribute("src")?.slice(0, 80)}`,
      ),
    };
  });
}

/** Controls in Chromium's accessibility tree that have no accessible name. */
async function unnamedControls(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const unnamed = nodes.filter(
    (node) =>
      !node.ignored &&
      CONTROL_ROLES.has(String(node.role?.value)) &&
      !String(node.name?.value ?? "").trim(),
  );
  const described = await Promise.all(
    unnamed.map(async (node) => {
      if (!node.backendDOMNodeId) return String(node.role?.value);
      const { node: dom } = await cdp.send("DOM.describeNode", {
        backendNodeId: node.backendDOMNodeId,
      });
      const attrs = dom.attributes ?? [];
      const pairs = [];
      for (let i = 0; i < attrs.length; i += 2) {
        if (/^(id|class|name|type|aria-\w+)$/.test(attrs[i]))
          pairs.push(`${attrs[i]}="${attrs[i + 1]}"`);
      }
      return `${node.role?.value} <${dom.localName} ${pairs.join(" ")}>`;
    }),
  );
  await cdp.detach();
  return described;
}

for (const viewport of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`axe ${viewport.width} ${theme}`, () => {
      test.use({ colorScheme: theme, viewport });

      for (const entry of PUBLIC_PAGES) {
        for (const locale of LOCALES) {
          const label = localePath(pageLabel(entry), locale);

          test(`${label} has no serious or critical axe violations`, async ({ page }) => {
            const url = await openPage(page, entry, locale);
            const violations = (await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze())
              .violations;
            // Below 1180 the menu is a state of its own: the panel is checked open too.
            const menu = page.locator("header.site-header button[aria-controls]");
            if (await menu.isVisible()) {
              await menu.click();
              const panel = `[id="${await menu.getAttribute("aria-controls")}"]`;
              await page.locator(panel).waitFor();
              const open = await new AxeBuilder({ page })
                .withTags(AXE_TAGS)
                .include(panel)
                .analyze();
              violations.push(...open.violations.map((v) => ({ ...v, id: `${v.id} (menu open)` })));
            }
            const blocking = violations.filter(
              (v) => v.impact === "serious" || v.impact === "critical",
            );
            for (const v of violations.filter((v) => !blocking.includes(v))) {
              test.info().annotations.push({ type: "axe", description: describeViolation(v) });
            }
            expect(
              blocking.map(describeViolation),
              `axe on ${url} at ${viewport.width} ${theme}`,
            ).toEqual([]);
          });
        }
      }
    });
  }

  // The structure is the same in both themes, so it is read once per width.
  test.describe(`structure ${viewport.width}`, () => {
    test.use({ viewport });

    for (const entry of PUBLIC_PAGES) {
      for (const locale of LOCALES) {
        const label = localePath(pageLabel(entry), locale);

        test(`${label} has one h1, ordered headings, alt on every img, named controls and a true current link`, async ({
          page,
        }) => {
          const url = await openPage(page, entry, locale);
          const at = `${url} at ${viewport.width}`;
          const structure = await readStructure(page);
          expect.soft(structure.h1s, `${at}: exactly one h1`).toHaveLength(1);
          expect.soft(structure.mains, `${at}: one main landmark`).toBe(1);
          expect.soft(structure.skips, `${at}: skipped heading levels in main`).toEqual([]);
          expect.soft(structure.imagesWithoutAlt, `${at}: img without alt`).toEqual([]);
          expect.soft(await unnamedControls(page), `${at}: controls without a name`).toEqual([]);
          expect
            .soft(structure.wrongCurrent, `${at}: aria-current="page" on another page's link`)
            .toEqual([]);
        });
      }
    }
  });
}
