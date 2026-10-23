import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminState = {
  loading: boolean;
  userId: string | null;
  /** An admin, signed in with two factors, on a live session (public.is_admin). */
  isAdmin: boolean;
  email: string | null;
};

/** Who is signed in to the studio, re-checked whenever the session changes. */
export function useAdmin(): AdminState {
  const [state, setState] = useState<AdminState>({
    loading: true,
    userId: null,
    isAdmin: false,
    email: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (!user) {
        if (!cancelled) setState({ loading: false, userId: null, isAdmin: false, email: null });
        return;
      }
      // The database's own check: the admin role, a two-factor (aal2) session, still live.
      const { data: allowed } = await supabase.rpc("is_admin");
      if (cancelled) return;
      setState({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        isAdmin: allowed === true,
      });
    }

    void refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Supabase asks that no other call awaits inside this callback.
      setTimeout(() => void refresh(), 0);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
