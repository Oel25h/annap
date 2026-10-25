/**
 * Site-wide data every page needs: settings, menus and social links. Each
 * isolate keeps it for 60 seconds, so a busy page costs no extra queries and
 * a studio change shows within a minute.
 */
import type { Locale } from "@/lib/i18n/locale";
import { fetchOverlays, overlayKey } from "./overlays.server";
import type { PublicDb } from "./supabase-public.server";

const TTL_MS = 60_000;

export type SiteSettings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  footerText: string;
  socialImageId: string | null;
  logoMediaId: string | null;
  legal: {
    name: string;
    address: string;
    companyNumber: string;
    vatNumber: string;
    charityNumber: string;
  };
  /** Approved Greek for the translatable settings, empty where there is none. */
  greek: { tagline: string; defaultSeoDescription: string; footerText: string };
};

export type NavItem = {
  id: string;
  label: string;
  labelLang: Locale;
  href: string;
  /** A site path (rendered with the router) or an outside link. */
  internal: boolean;
  children: NavItem[];
};

export type SocialLink = { id: string; platform: string; url: string; label: string };

export type SiteShell = {
  settings: SiteSettings;
  menus: { header: NavItem[]; headerAction: NavItem | null; footer: NavItem[]; legal: NavItem[] };
  socials: SocialLink[];
  /** Set when Turnstile is configured in the studio; forms then require it. */
  turnstileSiteKey: string | null;
};

type Memo<T> = { value: T; expires: number };
let settingsMemo: Memo<SiteSettings> | undefined;
const shellMemo = new Map<Locale, Memo<SiteShell>>();

const EMPTY_SETTINGS: SiteSettings = {
  siteName: "Anastasia Patience",
  tagline: "",
  contactEmail: "",
  defaultSeoTitle: "",
  defaultSeoDescription: "",
  footerText: "",
  socialImageId: null,
  logoMediaId: null,
  legal: { name: "", address: "", companyNumber: "", vatNumber: "", charityNumber: "" },
  greek: { tagline: "", defaultSeoDescription: "", footerText: "" },
};

export async function getSiteSettings(db: PublicDb): Promise<SiteSettings> {
  if (settingsMemo && settingsMemo.expires > Date.now()) return settingsMemo.value;
  const [{ data, error }, overlays] = await Promise.all([
    db.from("site_settings").select("*").eq("id", "site").maybeSingle(),
    fetchOverlays(db, { site_settings: ["site"] }),
  ]);
  if (error) throw new Error(`Site settings: ${error.message}`);
  const greek = overlays.get(overlayKey("site_settings", "site"))?.fields ?? {};
  const value: SiteSettings = data
    ? {
        siteName: data.site_name,
        tagline: data.tagline,
        contactEmail: data.contact_email,
        defaultSeoTitle: data.default_seo_title,
        defaultSeoDescription: data.default_seo_description,
        footerText: data.footer_text,
        socialImageId: data.social_image_id,
        logoMediaId: data.logo_media_id,
        legal: {
          name: data.legal_name,
          address: data.legal_address,
          companyNumber: data.company_number,
          vatNumber: data.vat_number,
          charityNumber: data.charity_number,
        },
        greek: {
          tagline: greek.tagline ?? "",
          defaultSeoDescription: greek.default_seo_description ?? "",
          footerText: greek.footer_text ?? "",
        },
      }
    : EMPTY_SETTINGS;
  settingsMemo = { value, expires: Date.now() + TTL_MS };
  return value;
}

type NavRow = {
  id: string;
  menu: string;
  label: string;
  url: string | null;
  parent_id: string | null;
  position: number;
  page: { path: string } | null;
};

function buildMenu(rows: NavRow[], menu: string, greek: Map<string, string>): NavItem[] {
  const toItem = (row: NavRow): NavItem => {
    // No address means a group label, such as Explore. A link to an
    // unpublished page also arrives with none, and is dropped below.
    const href = row.page?.path ?? row.url ?? "";
    const greekLabel = greek.get(row.id);
    return {
      id: row.id,
      label: greekLabel ?? row.label,
      labelLang: greekLabel ? "el" : "en",
      href,
      internal: href.startsWith("/"),
      children: [],
    };
  };
  const inMenu = rows.filter((r) => r.menu === menu).sort((a, b) => a.position - b.position);
  const top: NavItem[] = [];
  const byId = new Map<string, NavItem>();
  for (const row of inMenu.filter((r) => !r.parent_id)) {
    const item = toItem(row);
    top.push(item);
    byId.set(row.id, item);
  }
  for (const row of inMenu.filter((r) => r.parent_id)) {
    const parent = byId.get(row.parent_id!);
    const item = toItem(row);
    if (parent && item.href) parent.children.push(item);
  }
  return top.filter((item) => item.href !== "" || item.children.length > 0);
}

export async function getSiteShell(db: PublicDb, locale: Locale): Promise<SiteShell> {
  const memo = shellMemo.get(locale);
  if (memo && memo.expires > Date.now()) return memo.value;

  const [settings, nav, socials, integrations] = await Promise.all([
    getSiteSettings(db),
    db
      .from("navigation_items")
      .select("id, menu, label, url, parent_id, position, page:pages(path)")
      .order("position"),
    db.from("social_links").select("id, platform, url, label").order("position"),
    db.rpc("public_integrations"),
  ]);
  if (nav.error) throw new Error(`Navigation: ${nav.error.message}`);
  if (socials.error) throw new Error(`Social links: ${socials.error.message}`);

  const rows = (nav.data ?? []) as unknown as NavRow[];
  const greek = new Map<string, string>();
  if (locale === "el" && rows.length > 0) {
    const overlays = await fetchOverlays(db, { navigation_item: rows.map((r) => r.id) });
    for (const row of rows) {
      const label = overlays.get(overlayKey("navigation_item", row.id))?.fields.label;
      if (label) greek.set(row.id, label);
    }
  }

  const value: SiteShell = {
    settings,
    menus: {
      header: buildMenu(rows, "header", greek),
      headerAction: buildMenu(rows, "header_action", greek)[0] ?? null,
      footer: buildMenu(rows, "footer", greek),
      legal: buildMenu(rows, "legal", greek),
    },
    socials: socials.data ?? [],
    turnstileSiteKey:
      (integrations.data as { turnstileSiteKey?: string | null } | null)?.turnstileSiteKey ?? null,
  };
  shellMemo.set(locale, { value, expires: Date.now() + TTL_MS });
  return value;
}
