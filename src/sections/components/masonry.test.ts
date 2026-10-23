import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { ResolvedMedia } from "@/sections/types";
import { masonryShapes } from "./masonry";

const seed = [
  [1400, 933],
  [1200, 900],
  [1096, 1435],
  [1535, 1024],
  [768, 1024],
  [1200, 900],
].map(([width, height]) => ({ width, height }) as ResolvedMedia);

describe("masonryShapes", () => {
  test("two lanes keep each photo's own shape when they already end level", () => {
    assert.deepEqual(masonryShapes(seed, 2), [
      "3 / 2",
      "3 / 2",
      "4 / 5",
      "3 / 2",
      "4 / 5",
      "3 / 2",
    ]);
  });
  test("three lanes turn one wide photo upright, so every lane ends level", () => {
    assert.deepEqual(masonryShapes(seed, 3), [
      "3 / 2",
      "4 / 5",
      "4 / 5",
      "3 / 2",
      "4 / 5",
      "3 / 2",
    ]);
  });
  test("a long set keeps its natural shapes", () => {
    const natural = masonryShapes(seed, 2);
    assert.deepEqual(masonryShapes([...seed, ...seed], 4), [...natural, ...natural]);
  });
});
