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
  width: "narrow" | "default" | "full";
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
        title: "Turning pain into purpose.",
        accent: "purpose.",
        body: "I’m Anastasia. I help women turn their scars into stories, their stories into skills, and their skills into a life they love.",
        caption:
          "A daughter of Ghana, a woman of Cyprus, a mother by miracle, and a storyteller by calling.",
        imageMediaId: MEDIA.heroPortrait.id,
        primary: { label: "Read my story", href: "/about" },
        listenCta: true,
      }),
      s(
        "audiobook_player",
        "shelf",
        { title: "Listen, in my own voice." },
        { anchor: "listen", background: "cream" },
      ),
      s(
        "featured_book",
        "cover_left",
        {
          bookId: BOOK.fyrts,
          quote:
            "I read this in one sitting and cried the good kind of tears. It felt like a long letter from a wise older sister.",
          quoteBy: "Ama, Accra",
          showEbookGate: true,
        },
        { anchor: "book" },
      ),
      s("quote", "centred", {
        quote: "No matter what you’re facing, your reason to smile still exists.",
        source: "Find Your Reason to Smile",
      }),
      s(
        "video",
        "filmstrip",
        // The channel link comes from the YouTube profile in the studio's social links.
        { title: "On stage, on camera." },
        { anchor: "videos", background: "cocoa" },
      ),
      s(
        "two_column",
        "image_left",
        {
          title: "Where no one feels left behind.",
          lead: "We support individuals, families, and vulnerable lives facing hardship — through food assistance, compassionate care, community outreach, and care for rescued animals.",
          body: p("Each case is a person — not a number. Stories shared with care and permission."),
          imageMediaId: MEDIA.hands.id,
          caption: "Feeding hope, one heart at a time.",
          primary: { label: "Donate", href: "/foundation#give" },
          link: { label: "Volunteer", href: "/contact" },
          secondary: { label: "Impact stories", href: "/foundation#stories" },
        },
        { anchor: "foundation", background: "cream" },
      ),
      s(
        "latest_posts",
        "list",
        {
          title: "Stories from the honest middle.",
          count: 3,
          showCategories: true,
          link: { label: "All stories", href: "/blog" },
        },
        { anchor: "stories" },
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
      s("hero", "portrait_right", {
        title: "A life rewritten in the margins.",
        body: "My name is Anastasia Patience. I am a daughter of Ghana, a woman of Cyprus, a mother by miracle, and a storyteller by calling. This is the long version.",
        imageMediaId: MEDIA.portraitBurgundy.id,
        facts: [
          ["Based in", "Cyprus"],
          ["Continents that raised me", "Africa & Europe"],
          ["Founder of", "Patience Media House"],
        ].map(([label, value]) => item({ label, value })),
      }),
      s(
        "rich_text",
        "foreword",
        {
          title: "Every scar is a syllabus.",
          body: p(
            "My story is stitched together from grief, faith, and stubborn hope — and every book, masterclass, and blog post I make is a hand extended back to you.",
            "Every mother is a mystic. Every ordinary woman carries something the world desperately needs — usually the exact thing she thinks disqualifies her.",
            "I write for the woman rebuilding after loss, the mother whispering prayers over a sick child, the entrepreneur with a dream she’s afraid to name.",
          ),
        },
        { background: "cream" },
      ),
      s("timeline", "vertical", {
        title: "Every season taught me something.",
        link: { label: "Read the book", href: "/books/find-your-reason-to-smile" },
        items: [
          {
            label: "The beginning",
            title: "My parents",
            body: "My mother taught me to pray — and to stay quiet and steady in difficult times. My father taught me to work hard with discipline: to be polite, honest, and respectful.",
          },
          {
            label: "The crossing",
            title: "Two suitcases",
            body: "At twenty-four, I boarded a plane with two suitcases and a promise. I would build a life. I would send money home. I would become someone.",
            imageMediaId: MEDIA.sunset.id,
            caption: "From Ghana to Cyprus — and everywhere in between.",
          },
          {
            label: "The work",
            title: "Caregiver",
            body: "For years I cared for the elderly. Their stories became mine. Their loneliness taught me presence. Their courage taught me endurance.",
          },
          {
            label: "The first loss",
            title: "My brother",
            body: "When my younger brother died, something inside me broke that I didn’t know could break. I learned that grief has weather. Some days it rains and rains and doesn’t stop.",
          },
          {
            label: "The unmooring",
            title: "Without parents",
            body: "Losing my mother years later left me unmoored. Without parents in a foreign country, I had to find my own way — and become my own compass.",
          },
          {
            label: "The choice",
            title: "The pregnancy",
            body: "The doctors said terminate. There were risks. There were reasons. There were papers to sign. His name would become my miracle — because I believed his life was worth fighting for, even when the world told me otherwise.",
            pullQuote: "I chose faith. I chose him.",
          },
          {
            label: "The miracle",
            title: "My son",
            body: "He came into this world small, quiet, and perfect — already carrying a strength I could see in him. He is the reason I know God still writes stories with impossible endings.",
            imageMediaId: MEDIA.hands.id,
          },
          {
            label: "The dark room",
            title: "Depression",
            body: "Postpartum depression came like a fog with no exit. I stopped smiling. I stopped writing. I stopped believing I was still in there. Slowly, gently, I found my way back.",
          },
          {
            label: "Now",
            title: "Author & founder",
            body: "I write the books I needed. I teach the classes I wished I had. Find Your Reason to Smile is my letter to every woman who ever felt too broken to begin again.",
          },
        ].map((chapter) => item({ imageMediaId: null, caption: "", pullQuote: "", ...chapter })),
      }),
      s("quote", "statement", {
        quote:
          "To hand every woman a lantern for the dark seasons, and a map to build a life she loves once the light returns.",
        attribution: "My mission",
      }),
      s(
        "list",
        "plain",
        {
          title: "Five values, one calling.",
          items: [
            ["Faith", "Faith is the muscle I train first, every morning."],
            ["Resilience", "Not the loud kind. The quiet, unglamorous, keep-going kind."],
            ["Purpose", "I teach what I’ve lived."],
            ["Story", "Stories heal what statistics can’t reach."],
            ["Service", "If it doesn’t help someone rise, I don’t build it."],
          ].map(([title, body]) => item({ title, body })),
        },
        { background: "cream" },
      ),
      s("call_to_action", "band", {
        title: "Start with chapter one.",
        link: { label: "Listen to the first chapter", href: "/#listen" },
        secondary: { label: "Get the free eBook", href: "/#free-ebook" },
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
        title: "Books to carry you home.",
        intro: "Part memoir, part manual, written in the voice of a friend who has walked it.",
      }),
      s(
        "audiobook_player",
        "shelf",
        { title: "The audiobooks, read by me." },
        { anchor: "listen", background: "cream" },
      ),
      s(
        "ebook_gate",
        "card",
        {
          bookId: BOOK.fyrts,
          title: "Read it tonight, free.",
          body: "Leave your first name and email and Find Your Reason to Smile is yours to download straight away.",
          buttonLabel: "Send me the free eBook",
        },
        { anchor: "free-ebook" },
      ),
    ],
  },
  {
    path: "/blog",
    kind: "collection",
    locked: true,
    title: "Stories",
    seoTitle: "Stories: Anastasia Patience",
    seoDescription:
      "Stories on faith, purpose, women in business, digital skills and a life rebuilt after loss.",
    status: "published",
    sections: [
      s("latest_posts", "list", {
        title: "Stories for the brave and the becoming.",
        count: 12,
        showCategories: true,
        paginate: true,
      }),
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
        title: "I read every letter.",
        body: "Whether you’re inviting me to a stage, a story or a partnership, I would love to hear from you. I reply within a few days.",
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
      s("hero", "photo", {
        title: "Where no one feels left behind.",
        body: "We support individuals, families, and vulnerable lives facing hardship — through food assistance, compassionate care, community outreach, and care for rescued animals.",
        imageMediaId: MEDIA.hands.id,
        primary: { label: "Donate", href: "#give" },
        secondary: { label: "Impact stories", href: "#stories" },
      }),
      s("list", "plain", {
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
        { title: "Faces we hold close.", count: 6 },
        { anchor: "stories" },
      ),
      s(
        "list",
        "plain",
        {
          title: "What guides every act of care.",
          items: [
            ["Compassion", "We meet people where they are."],
            ["Dignity", "Help is given with respect, and stories are shared only with permission."],
            ["Service", "We show up, quietly and consistently."],
            ["Hope", "Every meal and every visit says: you are not forgotten."],
            ["Community", "None of this happens alone."],
          ].map(([title, body]) => item({ title, body })),
        },
        { background: "cream" },
      ),
    ],
  },
  {
    path: "/gallery",
    kind: "collection",
    locked: false,
    title: "Gallery",
    seoTitle: "Gallery: Anastasia Patience",
    seoDescription: "Photographs from Anastasia’s life and work.",
    status: "published",
    sections: [
      s("gallery", "masonry", {
        title: "A life in chapters.",
        imageMediaIds: [
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
    sections: [s("products", "grid", { title: "Tools for your becoming." })],
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
        title: "Masterclasses for the becoming.",
        intro:
          "Digital skills, digital products and the entrepreneurship playbook I wish I had sooner.",
      }),
      s(
        "newsletter",
        "inline",
        {
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
    seoDescription: "Talks, readings and conversations from Anastasia’s YouTube channel.",
    // Published: with no videos yet, its own empty state points to the channel.
    status: "published",
    sections: [s("video", "grid", { title: "On stage, on camera." })],
  },
  {
    path: "/events",
    kind: "collection",
    locked: true,
    title: "Events",
    seoTitle: "Events: Anastasia Patience",
    seoDescription: "Talks, readings and gatherings with Anastasia.",
    status: "draft",
    sections: [s("events", "upcoming_list", { title: "Come and say hello." })],
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
      s("press", "list", { title: "Conversations and coverage." }),
      s("media_kit", "default", {
        title: "For hosts and journalists.",
        shortBio:
          "Anastasia Patience is an author, storyteller and the founder of Patience Media House. Born in Ghana and living in Cyprus, she writes about faith, loss and resilience, most recently in her memoir Find Your Reason to Smile.",
        downloadMediaIds: [MEDIA.portraitBurgundy.id, MEDIA.coverFyrts.id],
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
      "Everything in one place: the free ebook, the audiobook, my stories, masterclasses and the foundation.",
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
            '<ul><li><strong>Letters (newsletter):</strong> your email address and language. You confirm by email before we send anything (double opt-in).</li><li><strong>Free ebook:</strong> your first name, email and language, so we can send the download link. Ticking the letters box is separate and optional.</li><li><strong>Contact form:</strong> your name, email and message.</li><li><strong>Purchases and gifts:</strong> your name, email and, for printed books, your delivery address. Card details go straight to Stripe; we never see them.</li><li><strong>In your browser only:</strong> for the audiobook player, the edition you chose, where you stopped in each chapter, the chapters you have finished and your playback speed; your language choice; and whether you closed the language suggestion. These stay on your device, and we never collect them. More in <a href="/cookies">cookies and storage</a>.</li></ul>',
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
            "<p>Printed books bought through other shops are covered by that shop’s terms.</p>",
            "<h2>Gifts to the foundation</h2>",
            "<p>Gifts are used for the foundation’s work. If you gave by mistake, contact us within 30 days and we will refund you. Monthly gifts can be changed or cancelled at any time from the link in your receipt.</p>",
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
  {
    path: "/cookies",
    kind: "legal",
    locked: true,
    title: "Cookies",
    seoTitle: "Cookies and storage",
    seoDescription:
      "What this website keeps in your browser, and why. No advertising or tracking cookies.",
    status: "published",
    sections: [
      s(
        "rich_text",
        "one_column",
        {
          // What the code stores: the locale cookie (src/lib/i18n/locale.ts), the
          // player's records (src/components/audio/store.ts), the dismissed language
          // suggestion and the studio's Supabase session. Keep it in step with them.
          body: [
            "<p>This website uses no advertising or tracking cookies and no analytics. What it keeps in your browser is there to remember your choices. It stays on your device, and we never collect it.</p>",
            "<h2>What your browser keeps</h2>",
            "<ul><li><strong>Your language:</strong> when you switch between English and Greek, one cookie (aph_locale) remembers your choice for a year.</li><li><strong>The audiobook player:</strong> for each audiobook edition, the chapter you are on, where you stopped, the chapters you have finished and your playback speed, and the edition you chose in each language. This is kept in your browser’s local storage, so you can pick up where you left off.</li><li><strong>The language suggestion:</strong> if you close the note that offers a page in your browser’s language, local storage remembers it for a year, so the note does not come back.</li><li><strong>The studio:</strong> only Anastasia and her team sign in. Their sign-in is kept in local storage until they sign out.</li></ul>",
            "<h2>Services that help run the site</h2>",
            "<ul><li><strong>Cloudflare Turnstile</strong> checks that a form is sent by a person, not a program. Cloudflare says Turnstile uses no cookies.</li><li><strong>YouTube</strong> videos use YouTube’s privacy-enhanced mode and load only when you press play. From then on, YouTube’s own cookies and terms apply to that video.</li><li><strong>Stripe</strong> takes payments on its own checkout pages, which set their own cookies to prevent fraud.</li></ul>",
            "<h2>Clearing it</h2>",
            "<p>You can delete all of this at any time in your browser’s settings for this site. Nothing breaks: the player starts again from the first chapter, and the language note may come back.</p>",
            '<p>For the details you give us in forms and orders, see the <a href="/privacy">privacy notice</a>.</p>',
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
    description: "The first chapters, in my own voice",
    href: "/#listen",
    featured: false,
  },
  {
    label: "Read my stories",
    description: "Stories from the honest middle.",
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
  footer_text = coalesce(nullif(footer_text, ''), ${q("Author, storyteller, entrepreneur. Founder of Patience Media House.")}),
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
  { menu: "header", label: "About", path: "/about" },
  { menu: "header", label: "Books", path: "/books" },
  { menu: "header", label: "Stories", path: "/blog" },
  { menu: "header", label: "Videos", path: "/videos" },
  { menu: "header", label: "Gallery", path: "/gallery" },
  { menu: "header", label: "Foundation", path: "/foundation" },
  { menu: "header", label: "Contact", path: "/contact" },
  { menu: "header_action", label: "Free eBook", url: "/#free-ebook" },
  {
    menu: "footer",
    label: "Explore",
    url: "/",
    children: [
      { menu: "footer", label: "About", path: "/about" },
      { menu: "footer", label: "Books", path: "/books" },
      { menu: "footer", label: "Stories", path: "/blog" },
      { menu: "footer", label: "Videos", path: "/videos" },
      { menu: "footer", label: "Gallery", path: "/gallery" },
    ],
  },
  {
    menu: "footer",
    label: "Company",
    url: "/foundation",
    children: [
      { menu: "footer", label: "Foundation", path: "/foundation" },
      { menu: "footer", label: "Patience Media House", path: "/shop" },
      { menu: "footer", label: "Masterclasses", path: "/masterclasses" },
      { menu: "footer", label: "Contact", path: "/contact" },
    ],
  },
  { menu: "legal", label: "Privacy", path: "/privacy" },
  { menu: "legal", label: "Terms", path: "/terms" },
  { menu: "legal", label: "Cookies", path: "/cookies" },
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

out.push(`-- The memoir's subtitle, as printed on its cover, when none is set yet.
update public.books
set subtitle = 'A Journey of Faith, Loss, Resilience, and Hope'
where slug = 'find-your-reason-to-smile' and coalesce(subtitle, '') = '';
`);

out.push(`-- The home lead story, when nothing is featured yet.
update public.blog_posts set featured = true
where slug = 'faith-when-the-doctors-say-no'
  and not exists (select 1 from public.blog_posts where featured);
`);

out.push(`-- The three starter stories in sentence case, while their titles are still the starter ones.
update public.blog_posts as p
set title = v.title
from (values
  ('the-morning-i-decided-to-keep-going', 'The Morning I Decided To Keep Going', 'The morning I decided to keep going'),
  ('your-first-digital-product-in-30-days', 'Your First Digital Product In 30 Days', 'Your first digital product in 30 days'),
  ('faith-when-the-doctors-say-no', 'Faith, When The Doctors Say No', 'Faith, when the doctors say no')
) as v(slug, seeded, title)
where p.slug = v.slug and p.title = v.seeded;
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
    "Send me Anastasia’s letters by email. I can unsubscribe at any time with the link in every letter.",
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
