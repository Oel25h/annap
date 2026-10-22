import { caps } from "@/lib/i18n/caps";
import { useLocale, useT } from "@/lib/i18n/context";
import type { SiteShell } from "@/server/site.server";
import { NewsletterForm } from "./NewsletterForm";
import { SiteLink } from "./SiteLink";

const PLATFORM_NAMES: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  linkedin: "LinkedIn",
  threads: "Threads",
  spotify: "Spotify",
  email: "Email",
  website: "Website",
};

/** The back cover: the letters signup, the colophon and the legal line. */
export function SiteFooter({ shell }: { shell: SiteShell }) {
  const t = useT();
  const locale = useLocale();
  const { settings, menus, socials } = shell;
  const blurb = (locale === "el" && settings.greek.footerText) || settings.footerText;
  const blurbLang = locale === "el" && settings.greek.footerText ? "el" : "en";
  const year = new Date().getFullYear();

  return (
    <footer className="back band-cocoa" aria-labelledby="letters-title">
      <div className="wrap">
        <div className="signup">
          <div>
            <h2 id="letters-title" className="display-l">
              {t.site.footer.lettersTitle}
            </h2>
            <p className="body">{t.site.footer.lettersBody}</p>
          </div>
          <NewsletterForm source="footer" />
        </div>
        <div className="colophon-grid">
          <div className="col-brand">
            <p className="wordmark">{settings.siteName}</p>
            {blurb && (
              <p className="small" lang={blurbLang}>
                {blurb}
              </p>
            )}
          </div>
          {menus.footer.map((group) => (
            <nav key={group.id} aria-label={group.label}>
              <p className="label" lang={group.labelLang}>
                {caps(group.label)}
              </p>
              <ul>
                {group.children.map((item) => (
                  <li key={item.id}>
                    <SiteLink href={item.href} lang={item.labelLang}>
                      {item.label}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          {socials.length > 0 && (
            <nav aria-label={t.site.footer.follow}>
              <p className="label">{caps(t.site.footer.follow)}</p>
              <ul>
                {socials.map((social) => (
                  <li key={social.id}>
                    <a href={social.url} rel="me noopener">
                      {social.label || PLATFORM_NAMES[social.platform] || social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
        <div className="legal">
          <span>
            © {year} {settings.legal.name || settings.siteName}. {t.site.footer.rights}
          </span>
          {menus.legal.length > 0 && (
            <span className="legal-links">
              {menus.legal.map((item) => (
                <SiteLink key={item.id} href={item.href} lang={item.labelLang}>
                  {item.label}
                </SiteLink>
              ))}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
