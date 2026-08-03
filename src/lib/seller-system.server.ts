import type { User } from "@supabase/supabase-js";

export type SellerIdentity = {
  userId: string;
  sellerId: string;
  name: string;
};

export type LinkedClient = {
  user: User;
  id: string;
  full_name: string | null;
  contact_email: string | null;
  email: string | null;
  phone: string | null;
  municipio_propriedade: string | null;
  uf: string | null;
};

export function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

export function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function authenticateRequest(request: Request) {
  const token = readBearerToken(request);
  if (!token) return { response: errorResponse("Não autorizado.", 401) } as const;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return { response: errorResponse("Sessão inválida.", 401) } as const;

  return { supabaseAdmin, user: data.user } as const;
}

export async function listAllAuthUsers(supabaseAdmin: any): Promise<User[]> {
  const users: User[] = [];
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

export async function resolveSellerIdentity(supabaseAdmin: any, user: User): Promise<SellerIdentity | null> {
  const appMetadata = { ...(user.app_metadata ?? {}) } as Record<string, unknown>;
  const userMetadata = { ...(user.user_metadata ?? {}) } as Record<string, unknown>;
  const trustedRole = appMetadata.account_type_override === "vendedor";
  const legacyRole = userMetadata.account_type_override === "vendedor";
  if (!trustedRole && !legacyRole) return null;

  const sellerSlug = `conta-${user.id}`;
  const trustedSellerId = typeof appMetadata.seller_record_id === "string"
    ? appMetadata.seller_record_id.trim()
    : "";
  let seller: { id: string; name: string } | null = null;

  if (trustedRole && trustedSellerId) {
    const result = await supabaseAdmin
      .from("sellers")
      .select("id, name")
      .eq("id", trustedSellerId)
      .eq("slug", sellerSlug)
      .eq("active", true)
      .maybeSingle();
    if (!result.error) seller = result.data;
  }

  if (!seller) {
    const result = await supabaseAdmin
      .from("sellers")
      .select("id, name")
      .eq("slug", sellerSlug)
      .eq("active", true)
      .maybeSingle();
    if (!result.error) seller = result.data;
  }

  if (!seller) return null;

  if (!trustedRole || trustedSellerId !== seller.id) {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...appMetadata,
        account_type_override: "vendedor",
        seller_record_id: seller.id,
      },
      user_metadata: {
        ...userMetadata,
        account_type_override: null,
        seller_record_id: null,
      },
    });
    if (error) {
      console.error("[seller-system] Falha ao migrar metadados protegidos:", error.message);
      return null;
    }
  }

  return { userId: user.id, sellerId: seller.id, name: seller.name };
}

export async function listLinkedClients(supabaseAdmin: any, sellerId: string): Promise<LinkedClient[]> {
  const users = await listAllAuthUsers(supabaseAdmin);
  const linkedUsers = users.filter((user) => user.user_metadata?.selected_seller_id === sellerId);
  if (!linkedUsers.length) return [];

  const userIds = linkedUsers.map((user) => user.id);
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,contact_email,email,phone,municipio_propriedade,uf")
    .in("id", userIds);
  if (error) throw error;

  const profileMap = new Map<string, any>();
  for (const profile of profiles ?? []) {
    profileMap.set(profile.id, profile);
  }

  return linkedUsers.map((user) => {
    const profile = profileMap.get(user.id) ?? {};
    return {
      user,
      id: user.id,
      full_name: profile.full_name ?? user.user_metadata?.full_name ?? null,
      contact_email: profile.contact_email ?? null,
      email: profile.email ?? user.email ?? null,
      phone: profile.phone ?? user.user_metadata?.phone ?? null,
      municipio_propriedade: profile.municipio_propriedade ?? null,
      uf: profile.uf ?? null,
    };
  });
}

export function linkedClientBelongsToSeller(client: User, sellerId: string): boolean {
  return client.user_metadata?.selected_seller_id === sellerId;
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase("pt-BR");
}
