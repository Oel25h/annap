import bookOne from "@/assets/book-one.jpg";
import bookTwo from "@/assets/book-two.jpg";
import blogOne from "@/assets/blog-one.jpg";
import blogTwo from "@/assets/blog-two.jpg";
import blogThree from "@/assets/blog-three.jpg";
import gSpeaking from "@/assets/gallery-speaking.jpg";
import gGhana from "@/assets/gallery-ghana.jpg";
import gCyprus from "@/assets/gallery-cyprus.jpg";
import gFamily from "@/assets/gallery-family.jpg";
import gBts from "@/assets/gallery-bts.jpg";
import gCommunity from "@/assets/gallery-community.jpg";

export const BOOKS = [
  {
    slug: "find-your-reason-to-smile",
    title: "Find Your Reason to Smile",
    tagline: "A companion for the days you almost gave up.",
    cover: bookOne,
    who: "For every woman rebuilding after loss, redefining herself after motherhood, or searching for hope in the middle of the ordinary.",
    description:
      "Part memoir, part gentle guide — a book about choosing joy on purpose. Anastasia shares the losses that broke her open and the small daily practices that carried her back to herself. If you've forgotten how to smile, this book will remind you.",
    formats: ["Paperback", "eBook", "Audiobook"],
    reviews: [
      {
        by: "Ama, Accra",
        quote:
          "I read this in one sitting and cried the good kind of tears. It felt like a long letter from a wise older sister.",
      },
      {
        by: "Elena, Nicosia",
        quote:
          "Every chapter is a hug. This book is a lantern for anyone walking through a dark season.",
      },
    ],
  },
  {
    slug: "turning-pain-into-purpose",
    title: "Turning Pain Into Purpose",
    tagline: "The workbook that turns your story into your calling.",
    cover: bookTwo,
    who: "For the woman with an idea burning inside her — and the pain behind it that she's afraid to touch.",
    description:
      "A companion workbook that walks you step by step from grief to gift. Journaling prompts, faith reflections, and practical business exercises help you extract meaning from what broke you and build something that heals others.",
    formats: ["Paperback", "eBook"],
    reviews: [
      {
        by: "Nana, London",
        quote: "I finally have language for the mission I've been carrying for years.",
      },
      { by: "Grace, Athens", quote: "Half prayer, half business plan. Exactly what I needed." },
    ],
  },
];

export const POSTS = [
  {
    slug: "the-morning-i-decided-to-keep-going",
    title: "The Morning I Decided To Keep Going",
    category: "Personal Stories",
    excerpt:
      "I was still in my nightdress when I made the promise that changed my life. This is what I whispered to God — and to myself — on that grey Cyprus morning.",
    date: "March 12, 2026",
    read: "6 min read",
    image: blogOne,
  },
  {
    slug: "your-first-digital-product-in-30-days",
    title: "Your First Digital Product In 30 Days",
    category: "Digital Skills",
    excerpt:
      "You don't need permission, a big audience, or a fancy website. You need a promise, a page, and a plan. Here's the exact framework I teach my students.",
    date: "February 28, 2026",
    read: "9 min read",
    image: blogTwo,
  },
  {
    slug: "faith-when-the-doctors-say-no",
    title: "Faith, When The Doctors Say No",
    category: "Purpose & Faith",
    excerpt:
      "They told me to terminate the pregnancy. I chose faith. My son is now four years old and calls me Mama. Here is what that season taught me.",
    date: "February 14, 2026",
    read: "7 min read",
    image: blogThree,
  },
];

export const CATEGORIES = [
  "All",
  "Purpose & Faith",
  "Women & Business",
  "Digital Skills",
  "Wellness & Lifestyle",
  "Personal Stories",
] as const;

export const GALLERY = [
  {
    chapter: "My Journey",
    caption: "From Ghana to Cyprus — and everywhere in between.",
    images: [
      { src: gGhana, alt: "Sunset silhouette, Ghana", w: 1200, h: 900 },
      { src: gCyprus, alt: "Mediterranean coastal town, Cyprus", w: 1200, h: 900 },
    ],
  },
  {
    chapter: "Family Moments",
    caption: "The people who taught me how to love.",
    images: [{ src: gFamily, alt: "Family moment", w: 1000, h: 1200 }],
  },
  {
    chapter: "Speaking & Livestreams",
    caption: "On stage, on camera, on purpose.",
    images: [{ src: gSpeaking, alt: "Speaking on stage", w: 1200, h: 900 }],
  },
  {
    chapter: "Community & Events",
    caption: "The women who show up for each other.",
    images: [{ src: gCommunity, alt: "Community gathering", w: 1200, h: 900 }],
  },
  {
    chapter: "Behind the Scenes",
    caption: "The unpolished moments that make the polished ones.",
    images: [{ src: gBts, alt: "Behind the scenes", w: 1200, h: 900 }],
  },
];

export const TESTIMONIALS = [
  {
    quote:
      "Anastasia has a way of speaking that feels like she's reading your journal. Her words gave me permission to stop pretending I was fine.",
    by: "Adwoa M.",
    role: "Reader, Ghana",
  },
  {
    quote:
      "The masterclass changed how I see my own story. I launched my first eBook six weeks later and made my first €400.",
    by: "Sophia K.",
    role: "Masterclass Alumna, Cyprus",
  },
  {
    quote:
      "She isn't selling motivation. She's offering a map — the one she walked herself. That's rare.",
    by: "Kate O.",
    role: "Reader, London",
  },
];
