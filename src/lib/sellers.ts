import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Seller = {
  id: string;
  user_id?: string | null;
  slug: string;
  show_on_team?: boolean;
  erp_seller_code?: string | null;
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

function onlyDigits(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

export function whatsappUrl(number?: string | null, message?: string): string {
  const digits = onlyDigits(number);
  if (!digits) return "#";
  const withDdi = digits.startsWith("55") ? digits : `55${digits}`;
  const base = `https://wa.me/${withDdi}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatPhoneDisplay(number?: string | null): string {
  const digits = onlyDigits(number);
  if (!digits) return "";
  const local = digits.startsWith("55") ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return number ?? "";
}

export function telHref(number?: string | null): string {
  const digits = onlyDigits(number);
  if (!digits) return "#";
  return `tel:+${digits.startsWith("55") ? digits : `55${digits}`}`;
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

      // Registros conta-* existem apenas para vínculo interno de login/chat.
      return ((data ?? []) as Seller[]).filter((seller) => !seller.slug.startsWith("conta-"));
    },
  });
}

export type RegisteredSeller = Pick<Seller, "id" | "name">;

type RegisteredSellersResponse = {
  sellers?: RegisteredSeller[];
  error?: string;
};

export function useRegisteredSellers() {
  return useQuery({
    queryKey: ["sellers", "registered"],
    queryFn: async (): Promise<RegisteredSeller[]> => {
      const response = await fetch("/api/public/registered-sellers", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as RegisteredSellersResponse;
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os vendedores.");
      return payload.sellers ?? [];
    },
  });
}

export function useSellerBySlug(slug: string) {
  return useQuery({
    queryKey: ["sellers", "slug", slug],
    queryFn: async (): Promise<Seller | null> => {
      if (slug.startsWith("conta-")) return null;
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
