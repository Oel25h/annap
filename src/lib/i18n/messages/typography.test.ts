import { test } from "node:test";
import assert from "node:assert/strict";
import { en } from "./en";
import { el } from "./el";

function leaves(node: unknown, path: string[] = []): [string, string][] {
  if (typeof node === "string") return [[path.join("."), node]];
  if (node && typeof node === "object")
    return Object.entries(node).flatMap(([k, v]) => leaves(v, [...path, k]));
  return [];
}

for (const [name, catalog] of Object.entries({ en, el })) {
  test(`${name} messages use typographic apostrophes`, () => {
    const straight = leaves(catalog).filter(([, s]) => /\p{L}'\p{L}/u.test(s));
    assert.deepEqual(straight, []);
  });
}
