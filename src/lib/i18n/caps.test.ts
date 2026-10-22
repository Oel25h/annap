import { test } from "node:test";
import assert from "node:assert/strict";
import { caps } from "./caps";

test("drops the tonos from Greek", () => {
  assert.equal(caps("Περιεχόμενα").toUpperCase(), "ΠΕΡΙΕΧΟΜΕΝΑ");
  assert.equal(caps("Έτοιμο για ακρόαση").toUpperCase(), "ΕΤΟΙΜΟ ΓΙΑ ΑΚΡΟΑΣΗ");
});

test("keeps a split diphthong apart with a dialytika", () => {
  assert.equal(caps("Μάιος").toUpperCase(), "ΜΑΪΟΣ");
  assert.equal(caps("ρολόι").toUpperCase(), "ΡΟΛΟΪ");
});

test("keeps an existing dialytika", () => {
  assert.equal(caps("Μαΐου").toUpperCase(), "ΜΑΪΟΥ");
});

test("leaves other scripts alone", () => {
  assert.equal(caps("Café · Ex libris"), "Café · Ex libris");
});
