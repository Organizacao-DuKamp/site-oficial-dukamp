import { supabase } from "@/integrations/supabase/client";

export type SellerLink = {
  seller: { id: string; name: string } | null;
};

type SellerLinkResponse = SellerLink & {
  ok?: boolean;
  error?: string;
};

async function request(init?: RequestInit): Promise<SellerLinkResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch("/api/account/seller-link", {
    ...init,
    headers,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as SellerLinkResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar o vendedor.");
  return payload;
}

export async function getSellerLink(): Promise<SellerLink> {
  const payload = await request();
  return { seller: payload.seller ?? null };
}

export async function setSellerLink(sellerId: string | null): Promise<SellerLink> {
  const payload = await request({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sellerId }),
  });

  // Atualiza o usuário local para que outros componentes reconheçam o novo vínculo.
  await supabase.auth.refreshSession().catch(() => undefined);
  return { seller: payload.seller ?? null };
}
