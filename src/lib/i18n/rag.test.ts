import { test } from "node:test";
import assert from "node:assert/strict";
import { nb } from "./rag";

const NB = " ";

test("binds one- and two-letter words to the next word", () => {
  assert.equal(
    nb("I help women turn their scars into stories"),
    `I${NB}help women turn their scars into stories`,
  );
  assert.equal(nb("a map to build a life"), `a${NB}map to${NB}build a${NB}life`);
});

test("binds runs of short words and Greek ones", () => {
  assert.equal(nb("Μετατρέπω τον πόνο σε σκοπό."), `Μετατρέπω τον πόνο σε${NB}σκοπό.`);
  assert.equal(nb("and to a life"), `and to${NB}a${NB}life`);
});

test("leaves longer words and a short last word alone", () => {
  assert.equal(nb("Turning pain into purpose."), "Turning pain into purpose.");
  assert.equal(nb("Where is it"), `Where is${NB}it`);
  assert.equal(nb(""), "");
});

test("works after opening quotes and dashes", () => {
  assert.equal(nb("«Σε ένα ταξίδι»"), `«Σε${NB}ένα ταξίδι»`);
  assert.equal(nb("faith — a way"), `faith — a${NB}way`);
});
