import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { normalizePagePath, parseSections } from "./pages.server";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("normalizePagePath", () => {
  test("lowercases and trims trailing slashes", () => {
    assert.equal(normalizePagePath("/About/"), "/about");
    assert.equal(normalizePagePath("/"), "/");
    assert.equal(normalizePagePath(""), "/");
  });

  test("refuses anything that cannot be a page path", () => {
    for (const bad of ["/../etc", "//evil.com", "/a b", "about", "/a//b", "/a?x=1"]) {
      assert.equal(normalizePagePath(bad), null, bad);
    }
  });
});

describe("parseSections", () => {
  test("keeps valid sections with defaults filled in", () => {
    const [hero] = parseSections([{ id: ID(1), type: "hero", props: { title: "Hi" } }], "/t");
    assert.equal(hero.type, "hero");
    assert.equal(hero.variant, "portrait_arch");
    assert.equal(hero.settings.background, "ivory");
  });

  test("skips unknown, invalid and hidden sections", () => {
    const sections = parseSections(
      [
        { id: ID(1), type: "marquee", props: {} },
        { id: ID(2), type: "hero", props: {} },
        { id: ID(3), type: "quote", settings: { hidden: true }, props: { quote: "Q" } },
        {
          id: ID(4),
          type: "call_to_action",
          props: { title: "T", link: { label: "Go", href: "javascript:alert(1)" } },
        },
        { id: ID(5), type: "quote", props: { quote: "Kept" } },
        null,
      ],
      "/t",
    );
    assert.deepEqual(
      sections.map((s) => s.id),
      [ID(5)],
    );
  });

  test("returns nothing for a value that is not a list", () => {
    assert.deepEqual(parseSections({ type: "hero" }, "/t"), []);
  });
});
