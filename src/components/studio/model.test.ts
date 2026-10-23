import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  draftChanges,
  greekStatus,
  isLocked,
  moveSection,
  moveTarget,
  type DraftSection,
} from "./model";

const section = (id: string, type: DraftSection["type"], props = {}, hidden = false) =>
  ({
    id,
    type,
    variant: undefined,
    settings: { hidden, anchor: "" },
    props,
  }) as unknown as DraftSection;

const home = [
  section("h", "hero"),
  section("p", "audiobook_player"),
  section("b", "featured_book"),
  section("q", "quote"),
  section("v", "video"),
];

describe("home order lock", () => {
  test("the hero and the player under it are locked on home only", () => {
    assert.equal(isLocked("home", home, 0), true);
    assert.equal(isLocked("home", home, 1), true);
    assert.equal(isLocked("home", home, 2), false);
    assert.equal(isLocked("standard", home, 0), false);
  });

  test("nothing moves into or out of a locked place", () => {
    assert.equal(moveTarget("home", home, 2, 1), null);
    assert.equal(moveTarget("home", home, 0, 1), null);
    assert.equal(moveTarget("home", home, 2, 3), 3);
    assert.equal(moveTarget("home", home, 4, 5), null);
  });
});

describe("draftChanges", () => {
  test("a move names the section that moved, not its neighbours", () => {
    const draft = moveSection(home, 4, 2);
    assert.deepEqual(
      draftChanges(home, draft).map((c) => [c.id, c.what]),
      [["v", "Moved"]],
    );
  });

  test("hidden, added and removed sections", () => {
    const draft = [
      ...home.slice(0, 3),
      { ...home[3], settings: { ...home[3].settings, hidden: true } },
    ];
    draft.push(section("n", "quote"));
    assert.deepEqual(
      draftChanges(home, draft as DraftSection[]).map((c) => [c.id, c.what]),
      [
        ["q", "Hidden"],
        ["n", "Added"],
        ["v", "Removed"],
      ],
    );
  });
});

describe("greekStatus", () => {
  const row = { status: "approved", fields: { quote: "Γεια" }, draftFields: null };
  test("missing, approved and stale", () => {
    assert.equal(greekStatus({ quote: "Hi" }, undefined, {}), "missing");
    assert.equal(
      greekStatus({ quote: "Hi" }, { ...row, sourceFields: { quote: "Hi" } } as never, {}),
      "approved",
    );
    assert.equal(
      greekStatus({ quote: "Hello" }, { ...row, sourceFields: { quote: "Hi" } } as never, {}),
      "stale",
    );
  });
});
