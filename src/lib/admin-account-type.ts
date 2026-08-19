import { supabase } from "@/integrations/supabase/client";
import type { AccountType } from "@/lib/auth";

type AccountTypeApiResponse = {
  ok?: boolean;
  accountType?: AccountType;
  sellerCode?: string | null;
  sellerIds?: string[];
  error?: string;
};

async function request(path: string, init?: RequestInit): Promise<AccountTypeApiResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, {
    ...init,
    headers,
  });
  const payload = (await response.json().catch(() => ({}))) as AccountTypeApiResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível gerenciar o tipo da conta.");
  return payload;
}

export async function getManagedAccountInfo(userId: string): Promise<{
  accountType: AccountType;
  sellerCode: string | null;
}> {
  const payload = await request(`/api/admin/account-type?userId=${encodeURIComponent(userId)}`);
  if (!payload.accountType) throw new Error("Não foi possível carregar o tipo da conta.");
  return {
    accountType: payload.accountType,
    sellerCode: payload.sellerCode ?? null,
  };
}

export async function getManagedAccountType(userId: string): Promise<AccountType> {
  return (await getManagedAccountInfo(userId)).accountType;
}

export async function getManagedSellerIds(): Promise<Set<string>> {
  const payload = await request("/api/admin/account-type");
  return new Set(payload.sellerIds ?? []);
}

export async function setManagedAccountType(userId: string, accountType: AccountType): Promise<void> {
  const payload = await request("/api/admin/account-type", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, accountType }),
  });
  if (!payload.ok) throw new Error(payload.error || "Não foi possível atualizar o tipo da conta.");
}

export async function setManagedSellerCode(userId: string, sellerCode: string): Promise<void> {
  const payload = await request("/api/admin/account-type", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, sellerCode }),
  });
  if (!payload.ok) throw new Error(payload.error || "Não foi possível atualizar o código do vendedor.");
}
