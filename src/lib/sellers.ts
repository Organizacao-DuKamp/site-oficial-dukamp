import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Seller = {
  id: string;
  slug: string;
  name: string;
  role: string | null;
  region: string | null;
  phone: string | null;
  whatsapp: string | null;
  photo_url: string | null;
  cutout_url: string | null;
  banner_url: string | null;
  active: boolean;
  display_order: number;
};

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

function onlyDigits(v?: string | null) {
  return (v ?? "").replace(/\D/g, "");
}

/** Monta URL do WhatsApp com DDI 55 se faltar */
export function whatsappUrl(number?: string | null, message?: string): string {
  const digits = onlyDigits(number);
  if (!digits) return "#";
  const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${withDdi}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/** Ex.: "16994118921" → "(16) 99411-8921" */
export function formatPhoneDisplay(number?: string | null): string {
  const d = onlyDigits(number);
  if (!d) return "";
  const local = d.startsWith("55") ? d.slice(2) : d;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return number ?? "";
}

export function telHref(number?: string | null): string {
  const d = onlyDigits(number);
  if (!d) return "#";
  return `tel:+${d.startsWith("55") ? d : `55${d}`}`;
}

export function useActiveSellers() {
  return useQuery({
    queryKey: ["sellers", "active"],
    queryFn: async (): Promise<Seller[]> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("active", true)
        .order("display_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Seller[];
    },
  });
}

export function useSellerBySlug(slug: string) {
  return useQuery({
    queryKey: ["sellers", "slug", slug],
    queryFn: async (): Promise<Seller | null> => {
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as Seller) ?? null;
    },
  });
}
