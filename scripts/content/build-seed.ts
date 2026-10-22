/**
 * Writes the starting-content migration: pages, menus, consent wording and
 * email templates. Every section is validated with the same Zod schemas the
 * site uses, so the migration can never seed a page the renderer rejects.
 *
 *   bun scripts/content/build-seed.ts > supabase/migrations/<timestamp>_redo_content.sql
 *
 * The migration only adds what is missing (on conflict do nothing, or "if the
 * table is empty"), so running it on the live database never overwrites
 * anything Anastasia or Joel has edited.
 */
import { SECTION_SCHEMAS, type SectionType } from "../../src/sections/schemas";
import { MEDIA } from "./media";

/** Placeholders replaced in SQL by the real ids, looked up by slug. */
const BOOK = {
  fyrts: "b00c0000-0000-4000-8000-000000000001",
  tpip: "b00c0000-0000-4000-8000-000000000002",
};
const BOOK_SLUGS: Record<string, string> = {
  [BOOK.fyrts]: "find-your-reason-to-smile",
  [BOOK.tpip]: "turning-pain-into-purpose",
};

let counter = 0;
/** Section ids that come out the same on every run, so the seed diffs cleanly. */
function uid(): string {
  counter += 1;
  return `c0de${String(counter).padStart(4, "0")}-0000-4000-8000-${String(counter).padStart(12, "0")}`;
}

type Settings = Partial<{
  anchor: string;
  background: "ivory" | "cream" | "cocoa";
  width: "narrow" | "default" | "wide" | "full";
  spacing: "compact" | "default" | "generous";
}>;

function s(
  type: SectionType,
  variant: string,
  props: Record<string, unknown>,
  settings: Settings = {},
) {
  const raw = { id: uid(), type, variant, settings, props };
  const parsed = SECTION_SCHEMAS[type].safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${type}: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  }
  return parsed.data;
}

const item = <T extends Record<string, unknown>>(value: T) => ({ id: uid(), ...value });
const p = (...paragraphs: string[]) => paragraphs.map((text) => `<p>${text}</p>`).join("");

type Page = {
  path: string;
  kind: "home" | "standard" | "collection" | "legal" | "links" | "system";
  locked: boolean;
  title: string;
  seoTitle: string;
  seoDescription: string;
  status: "published" | "draft";
  sections: unknown[];
};

const pages: Page[] = [
  {
    path: "/",
    kind: "home",
    locked: true,
    title: "Home",
    seoTitle: "Anastasia Patience: Find Your Reason to Smile",
    seoDescription:
      "Author, storyteller and founder of Patience Media House. Books, an audiobook in her own voice, and letters on faith, loss and building a life you love.",
    status: "published",
    sections: [
      s("hero", "portrait_arch", {
        eyebrow: "Author · Storyteller · Founder of Patience Media House",
        title: "Turning pain into purpose.",
        accent: "purpose",
        body: "I'm Anastasia. I help women turn their scars into stories, their stories into skills, and their skills into a life they love.",
        imageMediaId: MEDIA.heroPortrait.id,
        primary: { label: "Read my story", href: "/about" },
        secondary: { label: "Get the free ebook", href: "#free-ebook" },
        listenCta: true,
      }),
      s(
        "audiobook_player",
        "shelf",
        {
          eyebrow: "Listen",
          title: "Hear it in her own voice.",
          intro:
            "The first chapters are free. Press play and keep reading the site; the story follows you.",
        },
        { anchor: "listen" },
      ),
      s("featured_book", "cover_left", {
        bookId: BOOK.fyrts,
        eyebrow: "The book",
        showEbookGate: true,
      }),
      s(
        "two_column",
        "image_right",
        {
          eyebrow: "Who I am",
          title: "A woman who chose joy, on purpose.",
          body: p(
            "I write for the woman rebuilding after loss, the mother whispering prayers over a sick child, the entrepreneur with a dream she is afraid to name.",
            "My story is stitched together from grief, faith and stubborn hope, and every book, masterclass and letter I make is a hand extended back to you.",
          ),
          imageMediaId: MEDIA.portraitBurgundy.id,
          link: { label: "My story", href: "/about" },
        },
        { background: "cream" },
      ),
      s("testimonials", "single", { eyebrow: "", title: "" }),
      s("latest_posts", "list", {
        eyebrow: "The journal",
        title: "Letters from the honest middle.",
        count: 3,
        showCategories: true,
        link: { label: "All letters", href: "/blog" },
      }),
      s(
        "video",
        "latest",
        {
          eyebrow: "Videos",
          title: "On stage, on camera, on purpose.",
        },
        { background: "cocoa" },
      ),
      s(
        "call_to_action",
        "band",
        {
          eyebrow: "Patience Humanitarian Foundation",
          title: "Where no one feels left behind.",
          body: "Food assistance, compassionate care, community support and care for rescued animals: the work my story led me to.",
          link: { label: "Visit the foundation", href: "/foundation" },
        },
        { background: "cream" },
      ),
    ],
  },
  {
    path: "/about",
    kind: "standard",
    locked: false,
    title: "About",
    seoTitle: "About Anastasia Patience",
    seoDescription:
      "From Ghana to Cyprus, through loss, faith and motherhood: how Anastasia became an author, a storyteller and the founder of Patience Media House.",
    status: "published",
    sections: [
      s("hero", "portrait_arch", {
        eyebrow: "Meet Anastasia",
        title: "A life rewritten in the margins.",
        accent: "rewritten",
        body: "I am a daughter of Ghana, a woman of Cyprus, a mother by miracle and a storyteller by calling. This is the long version.",
        imageMediaId: MEDIA.portraitRust.id,
      }),
      s("timeline", "vertical", {
        eyebrow: "The chapters",
        title: "Every season taught me something.",
        items: [
          [
            "The beginning",
            "My parents",
            "My mother taught me to pray, and to stay quiet and steady in difficult times. My father taught me to work hard with discipline: to be polite, honest and respectful.",
          ],
          [
            "The crossing",
            "Two suitcases",
            "At twenty-four I boarded a plane with two suitcases and a promise. I would build a life. I would send money home. I would become someone.",
          ],
          [
            "The work",
            "Caregiver",
            "For years I cared for the elderly. Their stories became mine. Their loneliness taught me presence. Their courage taught me endurance.",
          ],
          [
            "The first loss",
            "My brother",
            "When my younger brother died, something inside me broke that I didn't know could break. I learned that grief has weather. Some days it rains and does not stop.",
          ],
          [
            "The unmooring",
            "Without parents",
            "Losing my mother years later left me unmoored. Without parents in a foreign country, I had to find my own way and become my own compass.",
          ],
          [
            "The choice",
            "The pregnancy",
            "The doctors said terminate. There were risks, reasons and papers to sign. I chose faith. I chose him, because I believed his life was worth fighting for, even when the world told me otherwise.",
          ],
          [
            "The miracle",
            "My son",
            "He came into this world small, quiet and perfect, already carrying a strength I could see in him. He is the reason I know God still writes stories with impossible endings.",
          ],
          [
            "The dark room",
            "Depression",
            "Postpartum depression came like a fog with no exit. I stopped smiling. I stopped writing. Slowly, gently, I found my way back.",
          ],
          [
            "Now",
            "Author and founder",
            "I write the books I needed. I teach the classes I wished I had. Find Your Reason to Smile is my letter to every woman who ever felt too broken to begin again.",
          ],
        ].map(([label, title, body]) => item({ label, title, body, imageMediaId: null })),
      }),
      s(
        "quote",
        "with_portrait",
        {
          quote:
            "To hand every woman a lantern for the dark seasons, and a map to build a life she loves once the light returns.",
          accent: "lantern",
          by: "My mission",
          imageMediaId: MEDIA.bookDesk.id,
        },
        { background: "cream" },
      ),
      s("rich_text", "with_pull_quote", {
        eyebrow: "What I believe",
        title: "Every scar is a syllabus.",
        body: p(
          "I believe every ordinary woman carries something the world needs, usually the very thing she thinks disqualifies her.",
          "I have lived the long nights: the phone call that changes everything, the hospital corridor, the morning you cannot find a reason to get up. I have also lived the slow return, one small practice at a time, until joy was something I chose again rather than something I waited for.",
          "That is what I write about, what I teach and why I started the foundation. Not because I have arrived, but because I know the way back, and I would rather walk it with you.",
        ),
        pullQuote: "Every mother is a mystic. Every scar is a syllabus.",
      }),
      s("list", "plain", {
        eyebrow: "What I stand on",
        title: "Five values, one calling.",
        items: [
          ["Faith", "Faith is the muscle I train first, every morning."],
          ["Resilience", "Not the loud kind. The quiet, unglamorous, keep-going kind."],
          ["Purpose", "Every scar is a syllabus. I teach what I have lived."],
          ["Story", "Stories heal what statistics cannot reach."],
          ["Service", "If it does not help someone rise, I do not build it."],
        ].map(([title, body]) => item({ title, body })),
      }),
      s("call_to_action", "card", {
        eyebrow: "The book",
        title: "Read the whole story.",
        body: "Find Your Reason to Smile is the memoir behind every chapter above, with the small daily practices that carried me back.",
        link: { label: "About the book", href: "/books/find-your-reason-to-smile" },
      }),
    ],
  },
  {
    path: "/books",
    kind: "collection",
    locked: true,
    title: "Books",
    seoTitle: "Books by Anastasia Patience",
    seoDescription:
      "Memoir, workbook and gentle wisdom: books to carry you through the seasons you cannot skip, in print, ebook and audio.",
    status: "published",
    sections: [
      s("book_list", "rows", {
        eyebrow: "The bookshelf",
        title: "Books to carry you home.",
        intro: "Part memoir, part manual, written in the voice of a friend who has walked it.",
      }),
      s(
        "audiobook_player",
        "shelf",
        {
          eyebrow: "Listen",
          title: "The audiobooks, read by the author.",
        },
        { anchor: "listen", background: "cocoa" },
      ),
      s(
        "ebook_gate",
        "card",
        {
          bookId: BOOK.fyrts,
          eyebrow: "Free ebook",
          title: "A copy for you, free.",
          body: "The complete ebook of Find Your Reason to Smile. Tell me your first name so I know who it is for.",
          buttonLabel: "Send me the ebook",
        },
        { anchor: "free-ebook" },
      ),
    ],
  },
  {
    path: "/blog",
    kind: "collection",
    locked: true,
    title: "Journal",
    seoTitle: "Journal: letters from Anastasia Patience",
    seoDescription:
      "Letters on faith, purpose, women in business, digital skills and a life rebuilt after loss.",
    status: "published",
    sections: [
      s("latest_posts", "list", {
        eyebrow: "The journal",
        title: "Letters for the brave and the becoming.",
        count: 12,
        showCategories: true,
        paginate: true,
      }),
      s(
        "newsletter",
        "band",
        {
          eyebrow: "Letters",
          title: "One letter a week, from my desk in Cyprus.",
          body: "Faith, purpose and the honest middle, straight to your inbox.",
        },
        { background: "cream" },
      ),
    ],
  },
  {
    path: "/contact",
    kind: "system",
    locked: true,
    title: "Contact",
    seoTitle: "Contact Anastasia Patience",
    seoDescription: "Speaking invitations, media enquiries, partnerships or a warm hello.",
    status: "published",
    sections: [
      s("contact_form", "default", {
        eyebrow: "Say hello",
        title: "I read every letter.",
        body: "Whether you are inviting me to a stage, a story or a partnership, I would love to hear from you. I reply within a few days.",
      }),
    ],
  },
  {
    path: "/foundation",
    kind: "standard",
    locked: false,
    title: "Patience Humanitarian Foundation",
    seoTitle: "Patience Humanitarian Foundation",
    seoDescription:
      "Where no one feels left behind: food assistance, compassionate care, community support and care for rescued animals.",
    status: "published",
    sections: [
      s("hero", "portrait_arch", {
        eyebrow: "Patience Humanitarian Foundation",
        title: "Where no one feels left behind.",
        accent: "left behind",
        body: "We support individuals, families and vulnerable lives facing hardship, through food assistance, compassionate care, community outreach and care for rescued animals.",
        imageMediaId: MEDIA.hands.id,
        primary: { label: "Give", href: "#give" },
        secondary: { label: "Read their stories", href: "#stories" },
      }),
      s("list", "numbered", {
        eyebrow: "What we do",
        title: "Four ways we care.",
        items: [
          ["Food assistance", "Groceries and warm meals for families who are going without."],
          [
            "Compassionate care",
            "Visits, company and practical help for the elderly, the sick and the lonely.",
          ],
          [
            "Community support",
            "Standing with families through hard seasons, so no one faces them alone.",
          ],
          [
            "Rescued animals",
            "Food, shelter and veterinary care for animals that have been abandoned.",
          ],
        ].map(([title, body]) => item({ title, body })),
      }),
      s(
        "donation",
        "card",
        {
          eyebrow: "Give",
          title: "Together, we can make a difference.",
          body: "Every gift becomes a meal, a visit or a rescue. Give once, or walk with us every month.",
          amounts: [10, 25, 50, 100],
          allowMonthly: true,
        },
        { anchor: "give", background: "cream" },
      ),
      s(
        "foundation_stories",
        "grid",
        {
          eyebrow: "Impact stories",
          title: "Faces we hold close.",
          count: 6,
        },
        { anchor: "stories" },
      ),
      s("list", "plain", {
        eyebrow: "Our values",
        title: "What guides every act of care.",
        items: [
          ["Compassion", "We meet people where they are."],
          ["Dignity", "Help is given with respect, and stories are shared only with permission."],
          ["Service", "We show up, quietly and consistently."],
          ["Hope", "Every meal and every visit says: you are not forgotten."],
          ["Community", "None of this happens alone."],
        ].map(([title, body]) => item({ title, body })),
      }),
    ],
  },
  {
    path: "/gallery",
    kind: "collection",
    locked: false,
    title: "Gallery",
    seoTitle: "Gallery: Anastasia Patience",
    seoDescription: "Photographs from Anastasia's life and work.",
    status: "published",
    sections: [
      s("gallery", "masonry", {
        eyebrow: "In pictures",
        title: "A life in chapters.",
        imageMediaIds: [
          MEDIA.heroPortrait.id,
          MEDIA.bookDesk.id,
          MEDIA.cyprus.id,
          MEDIA.portraitBurgundy.id,
          MEDIA.authorTable.id,
          MEDIA.portraitRust.id,
          MEDIA.sunset.id,
        ],
      }),
    ],
  },
  {
    path: "/shop",
    kind: "collection",
    locked: true,
    title: "Shop",
    seoTitle: "Shop: Patience Media House",
    seoDescription:
      "Digital products, templates, courses and masterclasses from Patience Media House.",
    status: "published",
    sections: [s("products", "grid", { eyebrow: "The shop", title: "Tools for your becoming." })],
  },
  {
    path: "/masterclasses",
    kind: "collection",
    locked: true,
    title: "Masterclasses",
    seoTitle: "Masterclasses with Anastasia Patience",
    seoDescription: "Turn your knowledge and ideas into digital products and income skills.",
    status: "published",
    sections: [
      s("masterclasses", "cards", {
        eyebrow: "Learn with me",
        title: "Masterclasses for the becoming.",
        intro:
          "Digital skills, digital products and the entrepreneurship playbook I wish I had sooner.",
      }),
      s(
        "newsletter",
        "inline",
        {
          eyebrow: "Be first to know",
          title: "Hear when the next class opens.",
          body: "Join the letters and you will hear about new masterclasses before anyone else.",
        },
        { background: "cream" },
      ),
    ],
  },
  {
    path: "/videos",
    kind: "collection",
    locked: true,
    title: "Videos",
    seoTitle: "Videos: Anastasia Patience",
    seoDescription: "Talks, readings and conversations from Anastasia's YouTube channel.",
    status: "draft",
    sections: [
      s("video", "grid", { eyebrow: "Videos", title: "On stage, on camera, on purpose." }),
    ],
  },
  {
    path: "/events",
    kind: "collection",
    locked: true,
    title: "Events",
    seoTitle: "Events: Anastasia Patience",
    seoDescription: "Talks, readings and gatherings with Anastasia.",
    status: "draft",
    sections: [s("events", "upcoming_list", { eyebrow: "Events", title: "Come and say hello." })],
  },
  {
    path: "/press",
    kind: "collection",
    locked: true,
    title: "Press",
    seoTitle: "Press: Anastasia Patience",
    seoDescription: "Press coverage and a media kit for journalists and hosts.",
    status: "draft",
    sections: [
      s("press", "list", { eyebrow: "In the press", title: "Conversations and coverage." }),
      s("media_kit", "default", {
        eyebrow: "Media kit",
        title: "For hosts and journalists.",
        shortBio:
          "Anastasia Patience is an author, storyteller and the founder of Patience Media House. Born in Ghana and living in Cyprus, she writes about faith, loss and resilience, most recently in her memoir Find Your Reason to Smile.",
        downloadMediaIds: [MEDIA.heroPortrait.id, MEDIA.portraitBurgundy.id, MEDIA.coverFyrts.id],
      }),
    ],
  },
  {
    path: "/start",
    kind: "links",
    locked: true,
    title: "Anastasia Patience",
    seoTitle: "Start here: Anastasia Patience",
    seoDescription:
      "Everything in one place: the free ebook, the audiobook, the journal, masterclasses and the foundation.",
    status: "published",
    // The link list is filled from the old start page's links in SQL below.
    sections: [],
  },
  {
    path: "/privacy",
    kind: "legal",
    locked: true,
    title: "Privacy",
    seoTitle: "Privacy notice",
    seoDescription:
      "What this website collects, why, who helps us run it, how long we keep it and your rights.",
    status: "published",
    sections: [
      s(
        "rich_text",
        "one_column",
        {
          body: [
            '<p>This website is run by Anastasia Patience and Patience Media House, based in Cyprus. This notice explains what we collect when you use it, why, and what you can ask us to do. To reach us about your data, use the <a href="/contact">contact page</a>.</p>',
            "<h2>What we collect</h2>",
            "<ul><li><strong>Letters (newsletter):</strong> your email address and language. You confirm by email before we send anything (double opt-in).</li><li><strong>Free ebook:</strong> your first name, email and language, so we can send the download link. Ticking the letters box is separate and optional.</li><li><strong>Contact form:</strong> your name, email and message.</li><li><strong>Purchases and gifts:</strong> your name, email and, for printed books, your delivery address. Card details go straight to Stripe; we never see them.</li><li><strong>In your browser only:</strong> where you stopped in an audiobook chapter, your language choice and whether you dismissed a notice. These stay on your device and are never sent to us.</li></ul>",
            "<h2>Why</h2>",
            "<p>We use your details only to do what you asked: send the letters you confirmed, the ebook you requested, a reply to your message, or the order you paid for. We rely on your consent for the letters and on taking the steps you asked for everything else. Records of payments are kept because the law requires it.</p>",
            "<h2>Who helps us run the site</h2>",
            "<ul><li><strong>Supabase</strong> (database and file storage, in the EU)</li><li><strong>Cloudflare</strong> (hosting, and a check that forms are filled in by people)</li><li><strong>Stripe</strong> (payments)</li><li><strong>Resend</strong> (sending emails)</li><li><strong>Google</strong> (YouTube videos, which load only when you press play)</li></ul>",
            "<p>We do not sell your data, and we do not use advertising or tracking cookies.</p>",
            "<h2>How long we keep it</h2>",
            "<ul><li>Unconfirmed newsletter sign-ups: deleted after 30 days.</li><li>Free ebook requests: 24 months, unless you also confirmed the letters.</li><li>Download links: they stop working after 7 days.</li><li>Contact messages: 24 months after we archive them.</li><li>Email delivery records: 12 months.</li><li>Orders and gifts: for as long as accounting law requires, after which names, emails and addresses are removed.</li></ul>",
            "<h2>Your rights</h2>",
            "<p>You can ask to see, correct or delete your data, or object to how we use it. Every letter has an unsubscribe link. If you are unhappy with how we handled your data, you can complain to the Commissioner for Personal Data Protection in Cyprus.</p>",
          ].join(""),
        },
        { width: "narrow" },
      ),
    ],
  },
  {
    path: "/terms",
    kind: "legal",
    locked: true,
    title: "Terms",
    seoTitle: "Terms of use",
    seoDescription: "The terms for using this website, buying from it and giving through it.",
    status: "published",
    sections: [
      s(
        "rich_text",
        "one_column",
        {
          body: [
            '<p>By using this website you agree to these terms. If anything is unclear, please <a href="/contact">get in touch</a>.</p>',
            "<h2>Words and pictures</h2>",
            "<p>The writing, recordings and photographs on this site belong to Anastasia Patience unless credited otherwise. You are welcome to share links and short quotations with credit. Please ask before reusing anything else.</p>",
            "<h2>Digital purchases</h2>",
            "<p>Ebooks, audio and other digital products are delivered as soon as payment is confirmed, through a download link that works for 7 days. When you buy, you agree that delivery starts straight away, which means the usual 14-day right to cancel ends once the download begins. If a file does not work, tell us and we will fix it or refund you.</p>",
            "<h2>Printed books</h2>",
            "<p>Printed books bought through other shops are covered by that shop's terms.</p>",
            "<h2>Gifts to the foundation</h2>",
            "<p>Gifts are used for the foundation's work. If you gave by mistake, contact us within 30 days and we will refund you. Monthly gifts can be changed or cancelled at any time from the link in your receipt.</p>",
            "<h2>Masterclasses</h2>",
            "<p>Each masterclass page sets out what is included, the dates and how to cancel.</p>",
            "<h2>The law</h2>",
            "<p>These terms are governed by the laws of the Republic of Cyprus. Nothing here limits your rights as a consumer.</p>",
          ].join(""),
        },
        { width: "narrow" },
      ),
    ],
  },
];

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const q = (value: string) => `'${value.replace(/'/g, "''")}'`;

function sectionsSql(sections: unknown[]): string {
  let sql = `${q(JSON.stringify(sections))}`;
  for (const [placeholder, slug] of Object.entries(BOOK_SLUGS)) {
    if (!sql.includes(placeholder)) continue;
    sql = `replace(${sql}, ${q(placeholder)}, coalesce((select id::text from public.books where slug = ${q(slug)}), ${q(placeholder)}))`;
  }
  return `${sql}::jsonb`;
}

const startDefaults = [
  {
    label: "Get the free ebook",
    description: "Find Your Reason to Smile, free to download",
    href: "/books#free-ebook",
    featured: true,
  },
  {
    label: "Listen to the audiobook",
    description: "The first chapters, read by Anastasia",
    href: "/#listen",
    featured: false,
  },
  {
    label: "Read the journal",
    description: "Letters on faith, purpose and the honest middle",
    href: "/blog",
    featured: false,
  },
  {
    label: "Masterclasses",
    description: "Turn what you know into income",
    href: "/masterclasses",
    featured: false,
  },
  {
    label: "Patience Humanitarian Foundation",
    description: "Where no one feels left behind",
    href: "/foundation",
    featured: false,
  },
].map((link) => item(link));

const startSection = s("link_list", "stacked", { items: startDefaults, showSocialLinks: true });

const out: string[] = [];
out.push(`-- Starting content for the redo: pages, menus, social links, praise,
-- consent wording and email templates. Generated by
-- scripts/content/build-seed.ts; edit that script, not this file.
--
-- Everything here only fills what is missing. Re-running it, or running it on
-- the live database, never overwrites an edit made in the studio.
`);

out.push(`-- Site settings: fill blanks only.
update public.site_settings set
  site_name = coalesce(nullif(site_name, ''), 'Anastasia Patience'),
  tagline = coalesce(nullif(tagline, ''), 'Find your reason to smile.'),
  default_seo_title = coalesce(nullif(default_seo_title, ''), 'Anastasia Patience'),
  default_seo_description = coalesce(nullif(default_seo_description, ''), ${q(
    "Author, storyteller and founder of Patience Media House. Books, an audiobook in her own voice, and letters on faith, loss and building a life you love.",
  )}),
  footer_text = coalesce(nullif(footer_text, ''), ${q("Written and read in Cyprus, with love.")}),
  social_image_id = coalesce(social_image_id, (select id from public.media_assets where id = ${q(MEDIA.socialCard.id)}::uuid))
where id = 'site';
`);

out.push("-- Pages.");
for (const page of pages) {
  const sections = page.path === "/start" ? [startSection] : page.sections;
  let sectionSql = sectionsSql(sections);
  if (page.path === "/start") {
    // Keep any links Anastasia added on the old start page, after the new ones.
    const known = startDefaults.map((link) => q(link.href)).join(", ");
    sectionSql = `(
    with old as (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'label', left(l.label, 80), 'description', left(coalesce(l.sub, ''), 140),
        'href', coalesce(l.to_path, l.href), 'featured', false
      ) order by l.sort_order), '[]'::jsonb) as items
      from public.start_page_links l
      where l.enabled
        and (l.to_path ~ '^/[a-z0-9/-]*$' or l.href ~ '^https://')
        and coalesce(l.to_path, l.href) not in (${known}, '/books', '/masterclasses', '/blog', '/foundation')
    )
    select jsonb_set(s.v, '{0,props,items}', (s.v #> '{0,props,items}') || old.items)
    from old, (select ${sectionSql} as v) s
  )`;
  }
  out.push(`insert into public.pages (path, kind, locked, title, seo_title, seo_description, status, published_at, sections)
values (${q(page.path)}, ${q(page.kind)}, ${page.locked}, ${q(page.title)}, ${q(page.seoTitle)}, ${q(page.seoDescription)}, ${q(page.status)}, ${page.status === "published" ? "now()" : "null"}, ${sectionSql})
on conflict (path) do nothing;
`);
}

type Nav = { menu: string; label: string; path?: string; url?: string; children?: Nav[] };
const nav: Nav[] = [
  { menu: "header", label: "Books", path: "/books" },
  { menu: "header", label: "About", path: "/about" },
  { menu: "header", label: "Journal", path: "/blog" },
  { menu: "header", label: "Foundation", path: "/foundation" },
  { menu: "header", label: "Contact", path: "/contact" },
  { menu: "header_action", label: "Free ebook", url: "/books#free-ebook" },
  {
    menu: "footer",
    label: "Read",
    url: "/books",
    children: [
      { menu: "footer", label: "Books", path: "/books" },
      { menu: "footer", label: "Journal", path: "/blog" },
      { menu: "footer", label: "Gallery", path: "/gallery" },
    ],
  },
  {
    menu: "footer",
    label: "Learn",
    url: "/masterclasses",
    children: [
      { menu: "footer", label: "Masterclasses", path: "/masterclasses" },
      { menu: "footer", label: "Shop", path: "/shop" },
      { menu: "footer", label: "Start here", path: "/start" },
    ],
  },
  {
    menu: "footer",
    label: "Foundation",
    url: "/foundation",
    children: [
      { menu: "footer", label: "Our work", path: "/foundation" },
      { menu: "footer", label: "Give", url: "/foundation#give" },
      { menu: "footer", label: "Contact", path: "/contact" },
    ],
  },
  { menu: "legal", label: "Privacy", path: "/privacy" },
  { menu: "legal", label: "Terms", path: "/terms" },
];

const navValue = (n: Nav, position: number, parent: string) =>
  `(${q(n.menu)}, ${q(n.label)}, ${n.path ? `(select id from public.pages where path = ${q(n.path)})` : "null"}, ${n.url ? q(n.url) : "null"}, ${parent}, ${position})`;

out.push(`-- Menus, only when there are none yet.
do $$
declare
  _parent uuid;
begin
  if exists (select 1 from public.navigation_items) then
    return;
  end if;
`);
nav.forEach((n, i) => {
  if (n.children) {
    out.push(`  insert into public.navigation_items (menu, label, page_id, url, parent_id, position)
  values ${navValue(n, i, "null")}
  returning id into _parent;
  insert into public.navigation_items (menu, label, page_id, url, parent_id, position) values
    ${n.children.map((c, j) => navValue(c, j, "_parent")).join(",\n    ")};`);
  } else {
    out.push(`  insert into public.navigation_items (menu, label, page_id, url, parent_id, position)
  values ${navValue(n, i, "null")};`);
  }
});
out.push(`end;
$$;
`);

out.push(`-- Social links from the old start page, when there are none yet.
insert into public.social_links (platform, url, label, position)
select p.platform, s.url, '', s.sort_order
from public.start_page_socials s
cross join lateral (
  select case lower(s.platform)
    when 'twitter' then 'x'
    when 'x' then 'x'
    else lower(s.platform)
  end as platform
) p
where s.enabled
  and s.url ~ '^https://'
  and p.platform in ('instagram', 'facebook', 'youtube', 'tiktok', 'x', 'linkedin', 'threads', 'spotify')
  and not exists (select 1 from public.social_links);
`);

out.push(`-- Praise: the reader reviews already on the live site, when there is none yet.
insert into public.testimonials (quote, name, role, book_id, published, position)
select r.quote,
  btrim(split_part(r.by_name, ',', 1)),
  btrim(substr(r.by_name, length(split_part(r.by_name, ',', 1)) + 2)),
  r.book_id, r.published, r.sort_order
from public.book_reviews r
where r.published and not exists (select 1 from public.testimonials);
`);

const consent: [string, string][] = [
  [
    "newsletter",
    "Send me Anastasia's letters by email. I can unsubscribe at any time with the link in every letter.",
  ],
  [
    "ebook_gate",
    "We use your first name and email to send you the ebook. We keep them for 24 months, or longer if you also join the letters.",
  ],
  ["contact", "We use your name, email and message only to reply to you."],
  [
    "checkout",
    "Your order details are used to deliver what you bought and kept as the law requires for accounting.",
  ],
  [
    "donation",
    "Your details are used to process your gift and send your receipt, and kept as the law requires for accounting.",
  ],
];
out.push(`-- Consent wording, version 1.
insert into public.consent_texts (key, version, body) values
  ${consent.map(([key, body]) => `(${q(key)}, 1, ${q(body)})`).join(",\n  ")}
on conflict (key, version) do nothing;
`);

const templates: [string, string, string][] = [
  [
    "newsletter_confirm",
    "Please confirm your email",
    "Thank you for asking for my letters. Please confirm your email with the button below, and the first one will be on its way.\n\nIf you did not ask for this, ignore this email and nothing will happen.",
  ],
  [
    "ebook_link",
    "Your copy of {bookTitle}",
    "Dear {firstName},\n\nHere is your copy of {bookTitle}. The download links work for 7 days.\n\nI hope it meets you exactly where you are.\n\nWith love,\nAnastasia",
  ],
  [
    "order_receipt",
    "Thank you for your order",
    "Thank you for your order. Your receipt is below, and any downloads are ready from the links in this email.",
  ],
  [
    "donation_thanks",
    "Thank you for your gift",
    "Thank you. Your gift becomes a meal, a visit or a rescue. Your receipt is below.",
  ],
  [
    "contact_autoreply",
    "I have your message",
    "Dear {name},\n\nThank you for writing. I read every message myself and will reply within a few days.\n\nWith warmth,\nAnastasia",
  ],
  ["contact_notification", "New message from {name}", "{name} ({email}) wrote about: {topic}"],
  [
    "waitlist_confirm",
    "You are on the list",
    "Dear {firstName},\n\nThank you. I will write to you as soon as places open in {title}.",
  ],
];
out.push(`-- Email templates she can edit in the studio.
insert into public.email_templates (key, subject, body) values
  ${templates.map(([key, subject, body]) => `(${q(key)}, ${q(subject)}, ${q(body)})`).join(",\n  ")}
on conflict (key) do nothing;
`);

console.log(out.join("\n"));
