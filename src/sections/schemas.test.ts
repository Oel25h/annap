import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { PAGE_ORDER_MESSAGES, pageOrderProblem, SECTION_SCHEMAS } from "./schemas";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("renamed values", () => {
  test("a section stored with the old 'wide' width renders on the grid", () => {
    const quote = SECTION_SCHEMAS.quote.parse({
      id: ID(1),
      type: "quote",
      settings: { width: "wide" },
      props: { quote: "Q" },
    });
    assert.equal(quote.settings.width, "default");
  });

  test("the old 'latest' video variant reads as the filmstrip", () => {
    const video = SECTION_SCHEMAS.video.parse({
      id: ID(1),
      type: "video",
      variant: "latest",
      props: {},
    });
    assert.equal(video.variant, "filmstrip");
  });

  test("unknown values are still refused", () => {
    const bad = SECTION_SCHEMAS.video.safeParse({
      id: ID(1),
      type: "video",
      variant: "toString",
      settings: { width: "huge" },
      props: {},
    });
    assert.equal(bad.success, false);
  });
});

describe("pageOrderProblem", () => {
  const hero = { id: ID(1), type: "hero", props: { title: "T" } };
  const player = { id: ID(2), type: "audiobook_player", props: {} };
  const quote = { id: ID(3), type: "quote", props: { quote: "Q" } };
  const hidden = <T extends object>(s: T) => ({ ...s, settings: { hidden: true } });

  test("accepts a home page that opens with the hero and the player", () => {
    assert.equal(pageOrderProblem("home", [hero, player, quote]), null);
  });

  test("refuses a home page whose hero is not first or not visible", () => {
    assert.equal(pageOrderProblem("home", [player, hero, quote]), PAGE_ORDER_MESSAGES.hero);
    assert.equal(pageOrderProblem("home", [hidden(hero), player]), PAGE_ORDER_MESSAGES.hero);
    assert.equal(pageOrderProblem("home", []), PAGE_ORDER_MESSAGES.hero);
  });

  test("refuses a home page whose player is not directly under the hero", () => {
    assert.equal(pageOrderProblem("home", [hero, quote, player]), PAGE_ORDER_MESSAGES.player);
    assert.equal(pageOrderProblem("home", [hero, hidden(player)]), PAGE_ORDER_MESSAGES.player);
    assert.equal(pageOrderProblem("home", [hero]), PAGE_ORDER_MESSAGES.player);
  });

  test("other pages may be in any order", () => {
    assert.equal(pageOrderProblem("standard", [quote, hero]), null);
  });
});
