import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatWhen, utcOffset } from "./format";

test("formatDate reads month first in English and day first in Greek", () => {
  assert.equal(formatDate("2026-03-12", "en"), "March 12, 2026");
  assert.equal(formatDate("2026-03-12", "el"), "12 Μαρτίου 2026");
  const short = { day: "numeric", month: "short", year: "numeric" } as const;
  assert.equal(formatDate("2026-02-14T09:00:00Z", "en", short), "Feb 14, 2026");
  assert.equal(formatDate(null, "en"), "");
});

test("utcOffset follows summer and winter time", () => {
  assert.equal(utcOffset("2026-12-12T17:00:00Z", "Asia/Nicosia"), "UTC+2");
  assert.equal(utcOffset("2026-07-12T17:00:00Z", "Asia/Nicosia"), "UTC+3");
});

test("utcOffset handles zero, negative and half-hour zones, and bad dates", () => {
  assert.equal(utcOffset("2026-03-02T17:00:00Z", "Africa/Accra"), "UTC");
  assert.equal(utcOffset("2026-12-12T17:00:00Z", "America/New_York"), "UTC−5");
  assert.equal(utcOffset("2026-12-12T17:00:00Z", "Asia/Kolkata"), "UTC+5:30");
  assert.equal(utcOffset("not a date", "Asia/Nicosia"), "");
});

test("formatWhen joins weekday, date and 24-hour time in the event's zone", () => {
  const options = { weekday: true, time: true, timeZone: "Asia/Nicosia" };
  assert.equal(
    formatWhen("2026-12-12T17:00:00Z", "en", options),
    "Saturday, December 12, 2026, 19:00",
  );
  assert.equal(
    formatWhen("2026-12-12T17:00:00Z", "el", options),
    "Σάββατο 12 Δεκεμβρίου 2026, 19:00",
  );
});

test("formatWhen crosses midnight in the zone, and is empty without a date", () => {
  assert.equal(
    formatWhen("2026-12-12T23:30:00Z", "en", { time: true, timeZone: "Asia/Nicosia" }),
    "December 13, 2026, 1:30",
  );
  assert.equal(formatWhen(null, "en"), "");
});
