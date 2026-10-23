import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdmin } from "@/hooks/useAdmin";
import studioCss from "@/styles/studio.css?url";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // The studio's own stylesheet, so visitors never download it.
  head: () => ({ links: [{ rel: "stylesheet", href: studioCss }] }),
  component: Gate,
  pendingComponent: Waiting,
});

function Gate() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <StudioGate />
    </QueryClientProvider>
  );
}

/** Space held at full height; the words appear only if the wait passes 400ms. */
function Waiting() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 400);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="studio-wait" role="status">
      {slow ? <p className="meta">Opening the studio…</p> : null}
    </div>
  );
}

function StudioGate() {
  const nav = useNavigate();
  const { loading, userId, isAdmin } = useAdmin();

  useEffect(() => {
    if (loading) return;
    // Signed out, or still to enter the two-factor code: the sign-in page takes it from here.
    if (!userId || !isAdmin) nav({ to: "/auth", replace: true });
  }, [loading, userId, isAdmin, nav]);

  if (loading || !userId || !isAdmin) return <Waiting />;
  return <Outlet />;
}
