import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAdmin } from "@/hooks/useAdmin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: Gate,
});

function Gate() {
  const nav = useNavigate();
  const { loading, userId, isAdmin } = useAdmin();

  useEffect(() => {
    if (loading) return;
    if (!userId || !isAdmin) nav({ to: "/auth", replace: true });
  }, [loading, userId, isAdmin, nav]);

  if (loading || !userId || !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#e8dccf] text-plum/75 text-sm font-medium uppercase tracking-[0.3em]">
        Loading…
      </div>
    );
  }
  return <Outlet />;
}
