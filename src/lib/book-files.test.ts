import assert from "node:assert/strict";
import { test } from "node:test";
import { filesForLocale, freeEbookOffer, nextBookFile } from "./book-files";

test("a new book starts with an English free ebook", () => {
  assert.deepEqual(nextBookFile([]), { purpose: "free_download", locale: "en" });
});

test("the next free ebook is Greek when English already has one", () => {
  assert.deepEqual(nextBookFile([{ purpose: "free_download", locale: "en" }]), {
    purpose: "free_download",
    locale: "el",
  });
});

test("a later book with both languages gets a sample, not a third ebook", () => {
  assert.deepEqual(
    nextBookFile([
      { purpose: "free_download", locale: "en" },
      { purpose: "free_download", locale: "el" },
    ]),
    { purpose: "sample", locale: "en" },
  );
});

test("each page receives only its own language", () => {
  const rows = [
    { locale: "en", id: "en-file" },
    { locale: "el", id: "el-file" },
  ];
  assert.deepEqual(
    filesForLocale(rows, "el", false).map((row) => row.id),
    ["el-file"],
  );
  assert.deepEqual(
    filesForLocale(rows, "en", false).map((row) => row.id),
    ["en-file"],
  );
});

test("a free ebook does not fall back to English", () => {
  const rows = [{ locale: "en", id: "en-file" }];
  assert.deepEqual(filesForLocale(rows, "el", false), []);
});

test("a purchase may still fall back to English", () => {
  const rows = [{ locale: "en", id: "en-file" }];
  assert.deepEqual(
    filesForLocale(rows, "el", true).map((row) => row.id),
    ["en-file"],
  );
});

test("Greek is unavailable only when that book has an English ebook and no Greek one", () => {
  assert.deepEqual(freeEbookOffer(new Set(["en"]), "el"), {
    freeDownload: null,
    greekEbookUnavailable: true,
  });
  assert.deepEqual(freeEbookOffer(new Set(["en", "el"]), "el"), {
    freeDownload: "el",
    greekEbookUnavailable: false,
  });
  assert.deepEqual(freeEbookOffer(new Set(["en"]), "en"), {
    freeDownload: "en",
    greekEbookUnavailable: false,
  });
  assert.deepEqual(freeEbookOffer(new Set(), "el"), {
    freeDownload: null,
    greekEbookUnavailable: false,
  });
});
