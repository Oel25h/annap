import { createFileRoute } from "@tanstack/react-router";
import { Share2 } from "lucide-react";
import { cardCls } from "@/components/admin/ui";
import { SocialsManager } from "@/components/admin/SocialsManager";

export const Route = createFileRoute("/_authenticated/admin/socials")({
  component: SocialsAdmin,
});

function SocialsAdmin() {
  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] uppercase tracking-[0.28em] text-plum/60">Global</div>
        <h1 className="mt-1 font-display text-3xl text-plum">Social media</h1>
        <p className="mt-2 max-w-2xl text-sm text-plum/70">
          One place, everywhere. These links appear in the site footer, the Contact page, and the
          Start (link-in-bio) page. Any change saves globally — no need to edit them per page.
        </p>
      </div>

      <section className={cardCls}>
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-burgundy/12 text-burgundy">
            <Share2 className="h-4 w-4" />
          </span>
          <div>
            <div className="font-display text-xl text-plum">Your accounts</div>
            <div className="text-xs text-plum/60">
              Drag to reorder. Hide any you don't want visible right now.
            </div>
          </div>
        </div>
        <div className="mt-5">
          <SocialsManager />
        </div>
      </section>
    </div>
  );
}
