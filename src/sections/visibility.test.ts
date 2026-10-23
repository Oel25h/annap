import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SECTION_SCHEMAS } from "./schemas";
import type { MediaMap, RenderedSection, ResolvedMedia } from "./types";
import { isEmpty } from "./visibility";

const IMAGE_ID = "00000000-0000-4000-8000-0000000000aa";

function gallery(): RenderedSection {
  const section = SECTION_SCHEMAS.gallery.parse({
    id: "00000000-0000-4000-8000-000000000001",
    type: "gallery",
    props: { title: "A life in chapters." },
  });
  return {
    ...section,
    lang: "en",
    englishKeys: [],
    data: { imageMediaIds: [IMAGE_ID] },
  } as unknown as RenderedSection;
}

function media(kind: ResolvedMedia["kind"]): MediaMap {
  return { [IMAGE_ID]: { id: IMAGE_ID, kind } as ResolvedMedia };
}

describe("isEmpty: gallery", () => {
  test("is empty when none of its ids resolve", () => {
    assert.equal(isEmpty(gallery(), {}), true);
  });

  test("shows when an id resolves to an image", () => {
    assert.equal(isEmpty(gallery(), media("image")), false);
  });

  test("ignores media that is not an image", () => {
    assert.equal(isEmpty(gallery(), media("audio")), true);
  });

  test("counts its ids when no media map is given", () => {
    assert.equal(isEmpty(gallery()), false);
  });
});
