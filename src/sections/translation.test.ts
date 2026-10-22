import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SECTION_SCHEMAS, type SectionOf } from "./schemas";
import { applyOverlay, extractTranslatable, hashFields, translatableKind } from "./translation";

const SECTION_ID = "00000000-0000-4000-8000-000000000001";
const ITEM_A = "00000000-0000-4000-8000-00000000000a";
const ITEM_B = "00000000-0000-4000-8000-00000000000b";

function faq(): SectionOf<"faq"> {
  return SECTION_SCHEMAS.faq.parse({
    id: SECTION_ID,
    type: "faq",
    props: {
      title: "Questions",
      items: [
        { id: ITEM_A, question: "Who is it for?", answer: "Anyone." },
        { id: ITEM_B, question: "How long?", answer: "Six weeks." },
      ],
    },
  });
}

function hero(): SectionOf<"hero"> {
  return SECTION_SCHEMAS.hero.parse({
    id: SECTION_ID,
    type: "hero",
    props: {
      title: "Patience",
      body: "A memoir.",
      primary: { label: "Read", href: "/books" },
      imageMediaId: "00000000-0000-4000-8000-0000000000f0",
    },
  });
}

describe("extractTranslatable", () => {
  test("keys repeated items by their id and skips empty fields", () => {
    assert.deepEqual(extractTranslatable(faq()), {
      title: "Questions",
      [`items.${ITEM_A}.question`]: "Who is it for?",
      [`items.${ITEM_A}.answer`]: "Anyone.",
      [`items.${ITEM_B}.question`]: "How long?",
      [`items.${ITEM_B}.answer`]: "Six weeks.",
    });
  });

  test("reads nested link labels but never links or media", () => {
    const fields = extractTranslatable(hero());
    assert.deepEqual(fields, { title: "Patience", body: "A memoir.", "primary.label": "Read" });
  });
});

describe("translatableKind", () => {
  test("knows plain, nested and item keys", () => {
    assert.equal(translatableKind("rich_text", "body"), "rich");
    assert.equal(translatableKind("hero", "primary.label"), "text");
    assert.equal(translatableKind("faq", `items.${ITEM_A}.answer`), "text");
  });

  test("refuses keys that are not declared", () => {
    assert.equal(translatableKind("hero", "primary.href"), undefined);
    assert.equal(translatableKind("hero", "imageMediaId"), undefined);
    assert.equal(translatableKind("faq", "items.not-a-uuid.answer"), undefined);
  });
});

describe("applyOverlay", () => {
  test("follows items by id after a reorder", () => {
    const section = faq();
    section.props.items.reverse();
    const { section: greek, complete } = applyOverlay(section, {
      title: "Ερωτήσεις",
      [`items.${ITEM_A}.question`]: "Για ποιον είναι;",
      [`items.${ITEM_A}.answer`]: "Για όλους.",
      [`items.${ITEM_B}.question`]: "Πόσο διαρκεί;",
      [`items.${ITEM_B}.answer`]: "Έξι εβδομάδες.",
    });
    assert.equal(complete, true);
    assert.equal(greek.props.items[0].id, ITEM_B);
    assert.equal(greek.props.items[0].question, "Πόσο διαρκεί;");
    assert.equal(greek.props.items[1].answer, "Για όλους.");
  });

  test("never takes links, media or undeclared keys from a translation", () => {
    const original = hero();
    const { section } = applyOverlay(original, {
      title: "Υπομονή",
      "primary.href": "https://evil.example",
      imageMediaId: "00000000-0000-4000-8000-0000000000ff",
      "settings.hidden": "true",
    });
    assert.equal(section.props.title, "Υπομονή");
    assert.equal(section.props.primary.href, "/books");
    assert.equal(section.props.imageMediaId, original.props.imageMediaId);
    assert.equal(section.settings.hidden, false);
  });

  test("reports incomplete Greek and leaves the English untouched", () => {
    const original = hero();
    const { section, complete } = applyOverlay(original, { title: "Υπομονή", body: "  " });
    assert.equal(complete, false);
    assert.equal(section.props.body, "A memoir.");
    assert.equal(original.props.title, "Patience", "the input section is not mutated");
  });

  test("a missing translation is incomplete", () => {
    assert.equal(applyOverlay(hero(), undefined).complete, false);
  });
});

describe("hashFields", () => {
  test("ignores key order and changes with the text", async () => {
    const a = await hashFields({ title: "A", body: "B" });
    const b = await hashFields({ body: "B", title: "A" });
    const c = await hashFields({ title: "A", body: "C" });
    assert.equal(a, b);
    assert.notEqual(a, c);
    assert.match(a, /^[0-9a-f]{64}$/);
  });
});
