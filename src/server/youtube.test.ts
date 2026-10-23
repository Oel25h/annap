/**
 * The YouTube sync's reading of the API, run on recorded answers in
 * ./fixtures/youtube. Nothing here calls YouTube.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  nextQuotaReset,
  parseApiError,
  parseDuration,
  parsePlaylistItems,
  parseVideos,
  planSync,
  uploadsPlaylistId,
} from "./youtube-parse.server";

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`./fixtures/youtube/${name}.json`, import.meta.url), "utf8"));

test("the uploads playlist is the channel id with UU in place of UC", () => {
  assert.equal(uploadsPlaylistId("UCzAbCdEfGhIjKlMnOpQrStU"), "UUzAbCdEfGhIjKlMnOpQrStU");
  assert.equal(uploadsPlaylistId("zAbCdEfGhIjKlMnOpQrStU"), null);
  assert.equal(uploadsPlaylistId(""), null);
});

test("durations in YouTube's ISO 8601 form become seconds", () => {
  assert.equal(parseDuration("PT1H2M5S"), 3725);
  assert.equal(parseDuration("PT9M"), 540);
  assert.equal(parseDuration("PT45S"), 45);
  assert.equal(parseDuration("P1DT2H"), 93600);
  assert.equal(parseDuration("P0D"), null, "a live stream has no length");
  assert.equal(parseDuration("PT"), null);
  assert.equal(parseDuration("9:00"), null);
  assert.equal(parseDuration(undefined), null);
});

test("playlist items give each video id once, newest first", () => {
  const page = parsePlaylistItems(fixture("playlist-items"));
  assert.deepEqual(page.ids, ["qaPO_4kKq4c", "7GmLtrV3_Jk", "LiveSoon001", "Ux-0aB1cD2e"]);
  assert.equal(page.nextPageToken, "EAAaBlBUOkNESQ");
  assert.deepEqual(parsePlaylistItems({}), { ids: [], nextPageToken: null });
});

test("videos carry title, description, length, date and the largest thumbnail", () => {
  const videos = parseVideos(fixture("videos"));
  assert.equal(videos.length, 4, "an item without a valid id is skipped");
  const [talk, greek, live, unlisted] = videos;

  assert.deepEqual(talk, {
    youtubeId: "qaPO_4kKq4c",
    title: "Why I wrote the last chapter twice",
    description: "A short talk about rewriting.\n\nThe book: https://example.com/books",
    publishedAt: "2026-10-20T16:00:07.000Z",
    durationSeconds: 3725,
    thumbnail: {
      url: "https://i.ytimg.com/vi/qaPO_4kKq4c/maxresdefault.jpg",
      width: 1280,
      height: 720,
    },
    showable: true,
  });
  assert.equal(greek.title, "Γράμμα σε μια γυναίκα που ξεκινά από την αρχή");
  assert.equal(greek.thumbnail?.url, "https://i.ytimg.com/vi/7GmLtrV3_Jk/hqdefault.jpg");
  assert.equal(greek.durationSeconds, 540);

  assert.equal(live.showable, false, "an upcoming live stream waits");
  assert.equal(live.durationSeconds, null);
  assert.equal(unlisted.showable, false, "an unlisted video stays off the site");
  assert.equal(unlisted.title, "Ux-0aB1cD2e", "an empty title falls back to the id");
  assert.equal(unlisted.publishedAt, null);
  assert.equal(unlisted.thumbnail, null);
});

test("errors are told apart: quota, key, API switched off, channel", () => {
  assert.equal(parseApiError(403, fixture("error-quota")).problem, "quota");
  assert.equal(parseApiError(400, fixture("error-key")).problem, "key");
  assert.equal(parseApiError(403, fixture("error-disabled")).problem, "disabled");
  assert.equal(parseApiError(404, fixture("error-playlist")).problem, "channel");
  const other = parseApiError(500, { error: { code: 500, message: "Backend Error" } });
  assert.equal(other.problem, "other");
  assert.match(other.message, /500/);
  assert.equal(parseApiError(502, "not json").problem, "other");
});

test("error messages never repeat what YouTube sent back", () => {
  for (const name of ["error-quota", "error-key", "error-disabled", "error-playlist"]) {
    const { message } = parseApiError(400, fixture(name));
    assert.doesNotMatch(message, /<|project 123456789/);
  }
});

test("after a quota error the cron waits until just past midnight in California", () => {
  // 10:00 UTC on 23 October 2026 is 03:00 in Los Angeles (PDT, UTC−7).
  const reset = nextQuotaReset(new Date("2026-10-23T10:00:00Z"));
  assert.equal(reset.toISOString(), "2026-10-24T07:01:00.000Z");
  // In winter (PST, UTC−8).
  const winter = nextQuotaReset(new Date("2026-12-01T20:30:00Z"));
  assert.equal(winter.toISOString(), "2026-12-02T08:01:00.000Z");
});

test("a sync adds new public uploads, updates known ones and hides the gone", () => {
  const latest = parseVideos(fixture("videos"));
  const checked = parseVideos(fixture("videos-check"));
  const plan = planSync(
    [
      { youtubeId: "7GmLtrV3_Jk", goneAt: null },
      { youtubeId: "OlderTalk01", goneAt: null },
      { youtubeId: "MadePrivat1", goneAt: null },
      { youtubeId: "DeletedVid1", goneAt: null },
      { youtubeId: "LongGone001", goneAt: "2026-01-01T00:00:00Z" },
    ],
    latest,
    checked,
  );
  assert.deepEqual(plan.upsert.map((v) => v.youtubeId).sort(), [
    "7GmLtrV3_Jk",
    "OlderTalk01",
    "qaPO_4kKq4c",
  ]);
  assert.deepEqual(plan.hide.sort(), ["DeletedVid1", "MadePrivat1"]);
});

test("a hidden video that is public again comes back", () => {
  const checked = parseVideos(fixture("videos-check"));
  const plan = planSync(
    [{ youtubeId: "OlderTalk01", goneAt: "2026-05-01T00:00:00Z" }],
    [],
    checked,
  );
  assert.deepEqual(
    plan.upsert.map((v) => v.youtubeId),
    ["OlderTalk01"],
  );
  assert.deepEqual(plan.hide, []);
});

test("an empty channel hides every video it no longer lists", () => {
  const plan = planSync([{ youtubeId: "OnlyOne0001", goneAt: null }], [], []);
  assert.deepEqual(plan, { upsert: [], hide: ["OnlyOne0001"] });
});
