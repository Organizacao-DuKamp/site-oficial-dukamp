import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

export type AccountType = "cliente" | "revendedor" | "produtor" | "empresa" | "vendedor" | "admin";

export function accountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    cliente: "Consumidor",
    revendedor: "Revendedor",
    produtor: "Produtor Rural",
    empresa: "Empresa",
    vendedor: "Vendedor",
    admin: "Administrador",
  };
  return labels[type];
}

type AuthCtx = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  accountType: AccountType;
  approvalNotice: AccountType | null;
  dismissApprovalNotice: () => Promise<void>;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function hasProtectedSellerRole(accessToken?: string): Promise<boolean> {
  if (!accessToken) return false;
  try {
    const response = await fetch("/api/account/effective-role", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as { accountTypeOverride?: string | null };
    return payload.accountTypeOverride === "vendedor";
  } catch (error) {
    console.error("[auth] Falha ao resolver cargo protegido:", error);
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("cliente");
  const [approvalNotice, setApprovalNotice] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setTimeout(() => void loadProfile(nextSession.user, nextSession.access_token), 0);
      } else {
        setIsAdmin(false);
        setAccountType("cliente");
        setApprovalNotice(null);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user, data.session.access_token);
      }
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  async function loadProfile(authUser: User, accessToken?: string) {
    const [rolesResult, profileResult, sellerRole] = await Promise.all([
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authUser.id)
        .eq("role", "admin")
        .maybeSingle(),
      (supabase as any)
        .from("profiles")
        .select("account_type, approval_notified")
        .eq("id", authUser.id)
        .maybeSingle(),
      hasProtectedSellerRole(accessToken),
    ]);

    const admin = Boolean(rolesResult.data);
    setIsAdmin(admin);

    const profile: any = profileResult.data ?? {};
    const profileType = (profile.account_type ?? "cliente") as AccountType;
    const effectiveType: AccountType = !admin && sellerRole ? "vendedor" : profileType;

    setAccountType(effectiveType);
    if (
      profile.approval_notified === false &&
      (effectiveType === "produtor" || effectiveType === "empresa")
    ) {
      setApprovalNotice(effectiveType);
    } else {
      setApprovalNotice(null);
    }
  }

  async function dismissApprovalNotice() {
    const currentUser = user;
    setApprovalNotice(null);
    if (!currentUser) return;
    await (supabase as any)
      .from("profiles")
      .update({ approval_notified: true })
      .eq("id", currentUser.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        isAdmin,
        isMasterAdmin:
          (user?.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase(),
        accountType,
        approvalNotice,
        dismissApprovalNotice,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const context = useContext(Ctx);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

type PriceFields = {
  price?: number | null;
  consumer_price?: number | null;
  producer_price?: number | null;
  on_sale?: boolean | null;
  sale_consumer_price?: number | null;
  sale_producer_price?: number | null;
};

type PixFields = {
  pix_price?: number | null;
  consumer_pix_price?: number | null;
  producer_pix_price?: number | null;
  on_sale?: boolean | null;
  sale_consumer_pix_price?: number | null;
  sale_producer_pix_price?: number | null;
};

export function regularPriceForAccount(product: PriceFields, type: AccountType): number {
  if (type === "produtor" && product.producer_price != null) {
    return Number(product.producer_price);
  }
  return Number(product.consumer_price ?? product.price ?? 0);
}

export function priceForAccount(product: PriceFields, type: AccountType): number {
  if (product.on_sale) {
    const sale =
      type === "produtor"
        ? product.sale_producer_price ?? product.sale_consumer_price
        : product.sale_consumer_price;
    if (sale != null) return Number(sale);
  }
  return regularPriceForAccount(product, type);
}

export function isOnSaleForAccount(product: PriceFields, type: AccountType): boolean {
  if (!product.on_sale) return false;
  const sale =
    type === "produtor"
      ? product.sale_producer_price ?? product.sale_consumer_price
      : product.sale_consumer_price;
  return sale != null && Number(sale) < regularPriceForAccount(product, type);
}

export function pixPriceForAccount(product: PixFields, type: AccountType): number | null {
  if (product.on_sale) {
    const sale =
      type === "produtor"
        ? product.sale_producer_pix_price ?? product.sale_consumer_pix_price
        : product.sale_consumer_pix_price;
    if (sale != null) return Number(sale);
  }

  let value: number | null | undefined;
  if (type === "produtor") value = product.producer_pix_price;
  else value = product.consumer_pix_price ?? product.pix_price;
  return value != null ? Number(value) : null;
}
