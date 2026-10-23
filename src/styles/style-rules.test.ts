/**
 * Guards for the rules in DESIGN.md that are easy to break by accident:
 * colours only from the palette and its named tints, no capitals or tracked
 * labels, no shadows, gradients or reveals, italic only on the hero accent and
 * <cite>, and no eyebrows, numerals, caps() or off-system utilities in the
 * public components.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

function files(dir: string, ext: RegExp): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const path = join(dir, name);
    if (statSync(join(ROOT, path)).isDirectory()) out.push(...files(path, ext));
    else if (ext.test(name)) out.push(path);
  }
  return out;
}

/** CSS without comments, so a rule explained in prose doesn't trip a check. */
function css(path: string): string {
  return readFileSync(join(ROOT, path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

const source = (path: string) => readFileSync(join(ROOT, path), "utf8");

const STYLES = files("src/styles", /\.css$/);
/** The studio (DESIGN.md §10–11): the shell, the page builder and sign-in. */
const STUDIO_TSX = [
  ...files("src/components/studio", /\.tsx?$/),
  "src/routes/auth.tsx",
  "src/routes/_authenticated/route.tsx",
  "src/routes/_authenticated/admin.tsx",
  "src/routes/_authenticated/admin.pages.index.tsx",
  "src/routes/_authenticated/admin.pages.$pageId.tsx",
  "src/routes/_authenticated/preview.page.$pageId.tsx",
  "src/routes/_authenticated/admin.media.tsx",
];

const PUBLIC_TSX = [
  ...files("src/sections", /\.tsx$/),
  ...files("src/components/site", /\.tsx$/),
  ...files("src/components/audio", /\.tsx?$/),
  ...files("src/components/forms", /\.tsx$/),
  ...STUDIO_TSX,
];

function offenders(paths: string[], pattern: RegExp, read = css): string[] {
  const found: string[] = [];
  for (const path of paths) {
    read(path)
      .split("\n")
      .forEach((line, i) => {
        if (pattern.test(line))
          found.push(`${relative(ROOT, join(ROOT, path))}:${i + 1}: ${line.trim()}`);
      });
  }
  return found;
}

/** A className value: "…", '…', {`…`} or any other {expression}, across lines. */
const CLASS_NAME =
  /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*`([^`]*)`\s*\}|\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\})/g;

function classOffenders(paths: string[], pattern: RegExp): string[] {
  const found: string[] = [];
  for (const path of paths) {
    const text = source(path);
    for (const match of text.matchAll(CLASS_NAME)) {
      const value = match[1] ?? match[2] ?? match[3] ?? match[4] ?? "";
      if (!pattern.test(value)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      found.push(`${path}:${line}: ${value.replace(/\s+/g, " ").trim()}`);
    }
  }
  return found;
}

describe("style rules", () => {
  test("hex colours live only in the palette (tokens.css)", () => {
    const others = STYLES.filter((p) => !p.endsWith("tokens.css"));
    assert.deepEqual(offenders(others, /#[0-9a-f]{3,8}\b/i), []);
  });

  test("no alpha colours outside the named tints (tokens.css)", () => {
    const others = [...STYLES.filter((p) => !p.endsWith("tokens.css")), ...PUBLIC_TSX];
    assert.deepEqual(offenders(others, /\b(rgba?|hsla?|color-mix)\(/i, source), []);
  });

  test("no capitals and no positive letter-spacing", () => {
    assert.deepEqual(offenders(STYLES, /text-transform:\s*(uppercase|capitalize)/), []);
    assert.deepEqual(offenders(STYLES, /letter-spacing:\s*(0?\.\d*[1-9]|[1-9])/), []);
  });

  test("flat: no shadows or gradients", () => {
    assert.deepEqual(offenders(STYLES, /(box|text)-shadow:\s*(?!none)/), []);
    assert.deepEqual(offenders(STYLES, /drop-shadow\(|(linear|radial|conic)-gradient\(/), []);
  });

  test("blur only on the header glass", () => {
    const others = STYLES.filter((p) => !p.endsWith("base.css"));
    assert.deepEqual(offenders(others, /backdrop-filter|filter:\s*blur/), []);
  });

  test("italic is set only by the type layer", () => {
    const others = STYLES.filter((p) => !p.endsWith("base.css") && !p.endsWith("fonts.css"));
    assert.deepEqual(offenders(others, /font-style:\s*italic/), []);
  });

  test("the type layer sets italic only on the hero accent and <cite>", () => {
    const allowed = new Set(["cite", ".display-xl em.accent"]);
    const rules = css("src/styles/base.css").matchAll(/([^{}]+)\{[^{}]*font-style:\s*italic/g);
    const selectors = [...rules].map((m) => m[1].replace(/\s+/g, " ").trim());
    assert.deepEqual(
      selectors.filter((s) => !allowed.has(s)),
      [],
    );
  });

  test("no scroll reveals", () => {
    assert.deepEqual(offenders(STYLES, /data-reveal|js-reveal/), []);
  });

  test("no eyebrows, numerals or caps() in public components", () => {
    assert.deepEqual(
      offenders(PUBLIC_TSX, /\beyebrow\b|\bcaps\(|toRoman|lowerRoman|Asterism|runhead/i, source),
      [],
    );
  });

  test("no off-system utilities in public classNames", () => {
    assert.deepEqual(
      classOffenders(
        PUBLIC_TSX,
        /\b(uppercase|tracking-[\w[.-]+|italic|shadow[\w-]*|rounded-(?!full\b)[\w[-]+|blur[\w-]*|animate-[\w-]+|text-\[|bg-\[)/,
      ),
      [],
    );
  });

  test("the studio draws its icons from the site set, not lucide", () => {
    assert.deepEqual(offenders(STUDIO_TSX, /from\s+["']lucide-react["']/, source), []);
  });
});
