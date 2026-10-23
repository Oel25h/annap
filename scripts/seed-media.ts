/**
 * Uploads the starting photo library (scripts/content/media.ts) to a Supabase
 * project: WebP variants at 160, 480, 960, 1600 and 2400 px (160 for the 32 and 36px
 * thumbnails; never wider than the original, which is added as the largest
 * variant), the original itself, the dominant colour, and one media_assets
 * row per image with its fixed id. Then points books, products, posts and the
 * site's social card at them where nothing is set yet.
 *
 *   SUPABASE_URL=… SUPABASE_SECRET_KEY=… bun scripts/seed-media.ts
 *   bun scripts/seed-media.ts --local             (reads `supabase status`)
 *   bun scripts/seed-media.ts --local --fixtures  (adds sample audio and a sample free ebook; local only)
 *
 * Safe to re-run: uploads overwrite the same paths and rows are upserted.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { MEDIA, MEDIA_LIST, type SeedImage } from "./content/media";

const WIDTHS = [160, 480, 960, 1600, 2400];
const args = new Set(process.argv.slice(2));

function localCredentials() {
  const cli = process.env.SUPABASE_CLI ?? "supabase";
  const status = JSON.parse(
    execFileSync(cli, ["status", "-o", "json"], { encoding: "utf8" }),
  ) as Record<string, string>;
  return { url: status.API_URL, key: status.SECRET_KEY ?? status.SERVICE_ROLE_KEY };
}

const { url, key } = args.has("--local")
  ? localCredentials()
  : {
      url: process.env.SUPABASE_URL ?? "",
      key: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    };
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY, or pass --local.");
  process.exit(1);
}
if (args.has("--fixtures") && !args.has("--local")) {
  console.error("--fixtures is for a local database only.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

async function upload(bucket: string, path: string, body: Buffer, contentType: string) {
  const { error } = await db.storage.from(bucket).upload(path, body, {
    contentType,
    upsert: true,
    cacheControl: "31536000",
  });
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
}

function hex(n: number) {
  return Math.round(n).toString(16).padStart(2, "0");
}

async function seedImage(image: SeedImage) {
  const source = readFileSync(image.file);
  const meta = await sharp(source).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const { dominant } = await sharp(source).stats();
  const color = `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`;

  // The standard widths that fit, plus the original's own width on top, so
  // nothing is ever upscaled and the full detail is still available.
  const widths = WIDTHS.filter((w) => w < width);
  widths.push(Math.min(width, WIDTHS[WIDTHS.length - 1]));

  const variants: { w: number; path: string }[] = [];
  for (const w of widths) {
    const path = `library/${image.key}/${w}.webp`;
    const body = await sharp(source)
      .rotate()
      .resize({ width: w })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();
    await upload("media", path, body, "image/webp");
    variants.push({ w, path });
  }

  const ext = extname(image.file).toLowerCase();
  const mime = ext === ".png" ? "image/png" : "image/jpeg";
  const originalPath = `library/${image.key}/original${ext}`;
  await upload("media", originalPath, source, mime);

  const [fx, fy] = image.focal ?? [0.5, 0.5];
  const { error } = await db.from("media_assets").upsert({
    id: image.id,
    kind: "image",
    bucket: "media",
    path: originalPath,
    mime,
    bytes: source.length,
    width,
    height,
    alt: image.alt,
    caption: image.caption ?? "",
    credit: "",
    focal_x: fx,
    focal_y: fy,
    dominant_color: color,
    variants,
    status: "ready",
    original_name: image.file.split("/").pop(),
  });
  if (error) throw new Error(`media_assets ${image.key}: ${error.message}`);

  if (image.coverUrl) {
    await db
      .from("books")
      .update({ cover_media_id: image.id })
      .eq("cover_url", image.coverUrl)
      .is("cover_media_id", null);
    await db
      .from("products")
      .update({ cover_media_id: image.id })
      .eq("image_url", image.coverUrl)
      .is("cover_media_id", null);
  }
  if (image.postCoverUrl) {
    await db
      .from("blog_posts")
      .update({ cover_media_id: image.id })
      .eq("cover_url", image.postCoverUrl)
      .is("cover_media_id", null);
  }
  if (image.postSlug) {
    await db
      .from("blog_posts")
      .update({ cover_media_id: image.id })
      .eq("slug", image.postSlug)
      .is("cover_media_id", null);
  }
  if (image.masterclassSlug) {
    await db
      .from("masterclasses")
      .update({ cover_media_id: image.id })
      .eq("slug", image.masterclassSlug)
      .is("cover_media_id", null);
  }
  console.log(`✓ ${image.key} (${variants.map((v) => v.w).join(", ")})`);
}

// ---------------------------------------------------------------------------
// Local fixtures: sample audiobook chapters and a sample free ebook, so the
// player and the ebook form can be tried before the real files arrive.
// ---------------------------------------------------------------------------

const FIXTURE = (n: number) => `f1070000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function tone(dir: string, name: string, seconds: number, frequency: number) {
  const out = join(dir, `${name}.mp3`);
  execFileSync("ffmpeg", [
    "-loglevel",
    "error",
    "-y",
    "-f",
    "lavfi",
    "-i",
    `sine=frequency=${frequency}:duration=${seconds}`,
    "-f",
    "lavfi",
    "-i",
    `anoisesrc=color=pink:amplitude=0.02:duration=${seconds}`,
    "-filter_complex",
    "[0:a]volume=0.08[a];[a][1:a]amix=inputs=2,afade=t=in:d=1,afade=t=out:st=" +
      (seconds - 1) +
      ":d=1",
    "-ac",
    "1",
    "-b:a",
    "64k",
    out,
  ]);
  return readFileSync(out);
}

async function fixtures() {
  const dir = mkdtempSync(join(tmpdir(), "seed-media-"));
  try {
    const { data: book } = await db
      .from("books")
      .select("id")
      .eq("slug", "find-your-reason-to-smile")
      .maybeSingle();
    const { data: secondBook } = await db
      .from("books")
      .select("id, title")
      .eq("slug", "turning-pain-into-purpose")
      .maybeSingle();
    // Chapter titles and opening lines in her words (the About page and the
    // book's own copy); the recordings are short tones.
    const editions = [
      {
        id: FIXTURE(100),
        bookId: book?.id ?? null,
        locale: "en",
        title: "Find Your Reason to Smile",
        subtitle: "Sample recording",
        cover: MEDIA.coverFyrts.id,
        chapters: [
          [
            "My Greatest Teachers",
            "My mother taught me the power of prayer and how to stay resilient through life’s difficulties.",
          ],
          [
            "A Young Girl Full of Dreams",
            "At twenty-four, I was a young girl full of dreams, not knowing that life had another plan for me.",
          ],
          ["Two Suitcases", "I boarded a plane with two suitcases and a promise."],
          [
            "My Brother",
            "When my younger brother died, something inside me broke that I didn’t know could break.",
          ],
          [
            "My Biggest Question to God",
            "Losing four of my family in the same season became my biggest question to God.",
          ],
          ["The Pregnancy", "The doctors said terminate. There were risks. There were reasons."],
          [
            "Faith, When the Doctors Said No",
            "He came into this world small, perfect, and quiet, living in his own world.",
          ],
          ["The Dark Room", "Postpartum depression came like a fog with no exit."],
          [
            "Find Your Reason to Smile",
            "I write the books I needed, for every woman who ever felt too broken to begin again.",
          ],
        ],
      },
      {
        id: FIXTURE(200),
        bookId: book?.id ?? null,
        locale: "el",
        title: "Βρες τον λόγο σου να χαμογελάς",
        subtitle: "Δείγμα ηχογράφησης",
        cover: MEDIA.coverFyrts.id,
        chapters: [
          [
            "Οι μεγαλύτεροι δάσκαλοί μου",
            "Η μητέρα μου μού έμαθε τη δύναμη της προσευχής και πώς να μένω ανθεκτική στις δυσκολίες.",
          ],
          [
            "Ένα κορίτσι γεμάτο όνειρα",
            "Στα είκοσι τέσσερα ήμουν ένα κορίτσι γεμάτο όνειρα, χωρίς να ξέρω ότι η ζωή είχε άλλα σχέδια για μένα.",
          ],
          ["Δύο βαλίτσες", "Μπήκα σε ένα αεροπλάνο με δύο βαλίτσες και μια υπόσχεση."],
          [
            "Ο αδελφός μου",
            "Όταν πέθανε ο μικρότερος αδελφός μου, κάτι μέσα μου έσπασε που δεν ήξερα ότι μπορούσε να σπάσει.",
          ],
          [
            "Η μεγαλύτερη ερώτησή μου στον Θεό",
            "Η απώλεια τεσσάρων ανθρώπων της οικογένειάς μου στην ίδια εποχή έγινε η μεγαλύτερη ερώτησή μου στον Θεό.",
          ],
          ["Η εγκυμοσύνη", "Οι γιατροί είπαν να διακόψω. Υπήρχαν κίνδυνοι. Υπήρχαν λόγοι."],
          [
            "Πίστη, όταν οι γιατροί είπαν όχι",
            "Ήρθε στον κόσμο μικρός, ήσυχος και τέλειος, ζώντας στον δικό του κόσμο.",
          ],
          ["Το σκοτεινό δωμάτιο", "Η επιλόχεια κατάθλιψη ήρθε σαν ομίχλη χωρίς έξοδο."],
          [
            "Βρες τον λόγο σου να χαμογελάς",
            "Γράφω τα βιβλία που χρειαζόμουν, για κάθε γυναίκα που ένιωσε πολύ σπασμένη για να ξαναρχίσει.",
          ],
        ],
      },
      {
        id: FIXTURE(300),
        bookId: secondBook?.id ?? null,
        locale: "en",
        // The book's own title, so the edition can never spell it differently.
        title: secondBook?.title ?? "Turning Pain Into Purpose",
        subtitle: "Sample recording",
        cover: MEDIA.coverTpip.id,
        chapters: [
          ["Sample Chapter One", ""],
          ["Sample Chapter Two", ""],
          ["Sample Chapter Three", ""],
          ["Sample Chapter Four", ""],
          ["Sample Chapter Five", ""],
          ["Sample Chapter Six", ""],
        ],
      },
    ];
    for (const edition of editions) {
      const { error } = await db.from("audiobooks").upsert({
        id: edition.id,
        book_id: edition.bookId,
        locale: edition.locale,
        title: edition.title,
        subtitle: edition.subtitle,
        narrator: "Anastasia Patience",
        cover_media_id: edition.cover,
        status: "published",
        published_at: new Date().toISOString(),
        position: edition.id === FIXTURE(200) ? 1 : edition.id === FIXTURE(300) ? 2 : 0,
      });
      if (error) throw new Error(`audiobooks: ${error.message}`);
      // Start the chapter list afresh, so renamed or removed sample chapters do not linger.
      const cleared = await db.from("audiobook_tracks").delete().eq("audiobook_id", edition.id);
      if (cleared.error) throw new Error(`tracks: ${cleared.error.message}`);
      const base = Number(edition.id.slice(-3));
      for (const [i, [title, openingLine]] of edition.chapters.entries()) {
        const seconds = 24 + i * 6;
        const mediaId = FIXTURE(base + 10 + i);
        const path = `fixtures/${base}/chapter-${i + 1}.mp3`;
        const body = tone(dir, `${base}-${i}`, seconds, 196 + i * 22);
        // The last chapter is "in the full audiobook" so the locked state shows.
        // A paid chapter's file lives in the private downloads bucket (the
        // database refuses it in the public audio bucket); drop any copy an
        // earlier seed left there.
        const free = i < edition.chapters.length - 1;
        const bucket = free ? "audio" : "downloads";
        await upload(bucket, path, body, "audio/mpeg");
        if (!free) await db.storage.from("audio").remove([path]);
        const media = await db.from("media_assets").upsert({
          id: mediaId,
          kind: "audio",
          bucket,
          path,
          mime: "audio/mpeg",
          bytes: body.length,
          duration_seconds: seconds,
          alt: "",
          caption: "",
          credit: "",
          variants: [],
          status: "ready",
          original_name: `chapter-${i + 1}.mp3`,
        });
        if (media.error) throw new Error(`audio media: ${media.error.message}`);
        const track = await db.from("audiobook_tracks").upsert({
          id: FIXTURE(base + 30 + i),
          audiobook_id: edition.id,
          title,
          opening_line: openingLine,
          audio_media_id: mediaId,
          duration_seconds: seconds,
          free_to_stream: free,
          position: i,
        });
        if (track.error) throw new Error(`tracks: ${track.error.message}`);
      }
      console.log(`✓ sample audiobook (${edition.title}, ${edition.locale})`);
    }

    if (book) {
      // A one-page sample PDF (the cover on a cream page) standing in for the ebook.
      const cover = await sharp(readFileSync(MEDIA.coverFyrts.file))
        .resize({ width: 900 })
        .toBuffer();
      const page = await sharp({
        create: { width: 1240, height: 1754, channels: 3, background: "#fffaf5" },
      })
        .composite([{ input: cover, top: 280, left: 170 }])
        .jpeg({ quality: 85 })
        .toBuffer();
      const pagePath = join(dir, "page.jpg");
      writeFileSync(pagePath, page);
      const pdfPath = join(dir, "sample.pdf");
      execFileSync("python3", [
        "-c",
        "import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],'PDF',resolution=150)",
        pagePath,
        pdfPath,
      ]);
      const body = readFileSync(pdfPath);
      const mediaId = FIXTURE(300);
      await upload(
        "downloads",
        "fixtures/find-your-reason-to-smile-sample.pdf",
        body,
        "application/pdf",
      );
      const media = await db.from("media_assets").upsert({
        id: mediaId,
        kind: "document",
        bucket: "downloads",
        path: "fixtures/find-your-reason-to-smile-sample.pdf",
        mime: "application/pdf",
        bytes: body.length,
        alt: "",
        caption: "",
        credit: "",
        variants: [],
        status: "ready",
        original_name: "find-your-reason-to-smile.pdf",
      });
      if (media.error) throw new Error(`pdf media: ${media.error.message}`);
      const file = await db.from("book_files").upsert(
        { book_id: book.id, locale: "en", purpose: "free_download", media_id: mediaId },
        {
          onConflict: "book_id,locale,purpose,media_id",
        },
      );
      if (file.error) throw new Error(`book_files: ${file.error.message}`);
      const { data: audiobookFormat } = await db
        .from("book_formats")
        .select("id")
        .eq("book_id", book.id)
        .eq("format", "audiobook")
        .maybeSingle();
      if (!audiobookFormat) {
        const format = await db.from("book_formats").insert({
          book_id: book.id,
          format: "audiobook",
          retailer: "",
          available: true,
          position: 3,
        });
        if (format.error) throw new Error(`book_formats: ${format.error.message}`);
      }
      console.log("✓ sample free ebook");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

for (const image of MEDIA_LIST) await seedImage(image);

await db
  .from("site_settings")
  .update({ social_image_id: MEDIA.socialCard.id })
  .eq("id", "site")
  .is("social_image_id", null);

if (args.has("--fixtures")) await fixtures();
console.log("Done.");
