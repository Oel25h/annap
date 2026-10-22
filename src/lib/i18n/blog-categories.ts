import type { Messages } from "./messages";

/** English category keys stored in the database / admin. */
export const BLOG_CATEGORY_KEYS = [
  "Purpose & Faith",
  "Women & Business",
  "Digital Skills",
  "Wellness & Lifestyle",
  "Personal Stories",
] as const;

export type BlogCategoryKey = (typeof BLOG_CATEGORY_KEYS)[number];

export const BLOG_FILTER_KEYS = ["All", ...BLOG_CATEGORY_KEYS] as const;
export type BlogFilterKey = (typeof BLOG_FILTER_KEYS)[number];

/** Localized label for a blog category. Falls back to the raw key if unknown. */
export function labelBlogCategory(t: Messages, category: string): string {
  const map = t.blog.categories as Record<string, string>;
  return map[category] ?? category;
}

export function labelBlogFilter(t: Messages, filter: BlogFilterKey): string {
  if (filter === "All") return t.blog.all;
  return labelBlogCategory(t, filter);
}
