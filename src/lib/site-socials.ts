import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteSocial = {
  id: string;
  platform: string;
  url: string;
  sort_order: number;
  enabled: boolean;
};

export const SITE_SOCIALS_KEY = ["site-socials"] as const;

export function useSiteSocials() {
  return useQuery({
    queryKey: SITE_SOCIALS_KEY,
    queryFn: async (): Promise<SiteSocial[]> => {
      const { data } = await supabase
        .from("start_page_socials")
        .select("*")
        .eq("enabled", true)
        .order("sort_order");
      return (data ?? []) as SiteSocial[];
    },
    staleTime: 5 * 60_000,
  });
}
