import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSiteSettings() {
  return useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "general")
        .maybeSingle();
      return (data?.value as Record<string, string> | null) ?? {};
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function whatsappLink(phone: string | undefined, message: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const num = digits || "5500000000000";
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
