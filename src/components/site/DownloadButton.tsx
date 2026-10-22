import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/context";
import { Icon } from "./Icon";

/**
 * A download as a one-click form: it posts to /api/download/…, which counts
 * the use and sends the browser on to the file. Mail scanners and link
 * previews only follow links, so they never use up a download.
 */
export function DownloadButton({
  action,
  children,
  variant = "primary",
}: {
  action: string;
  children: ReactNode;
  variant?: "primary" | "quiet";
}) {
  const locale = useLocale();
  return (
    <form method="post" action={action} className="download-form">
      <input type="hidden" name="lang" value={locale} />
      <button className={`btn btn-${variant}`} type="submit">
        <Icon name="arrow-down" />
        <span>{children}</span>
      </button>
    </form>
  );
}
