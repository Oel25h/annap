import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminState = {
  loading: boolean;
  userId: string | null;
  isAdmin: boolean;
  email: string | null;
};

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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .limit(1);
      if (cancelled) return;
      setState({
        loading: false,
        userId: user.id,
        email: user.email ?? null,
        isAdmin: (roles?.length ?? 0) > 0,
      });
    }

    refresh();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
