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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("cliente");
  const [approvalNotice, setApprovalNotice] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadProfile(s.user), 0);
      } else {
        setIsAdmin(false);
        setAccountType("cliente");
        setApprovalNotice(null);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadProfile(data.session.user);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function loadProfile(authUser: User) {
    const [rolesR, profileR] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", authUser.id).eq("role", "admin").maybeSingle(),
      (supabase as any).from("profiles").select("account_type, approval_notified").eq("id", authUser.id).maybeSingle(),
    ]);

    const admin = !!rolesR.data;
    setIsAdmin(admin);

    const p: any = profileR.data ?? {};
    const profileType = (p.account_type ?? "cliente") as AccountType;
    const metadataType = authUser.user_metadata?.account_type_override;
    const t: AccountType = !admin && metadataType === "vendedor" ? "vendedor" : profileType;

    setAccountType(t);
    if (p.approval_notified === false && (t === "produtor" || t === "empresa")) {
      setApprovalNotice(t);
    } else {
      setApprovalNotice(null);
    }
  }

  async function dismissApprovalNotice() {
    const u = user;
    setApprovalNotice(null);
    if (!u) return;
    await (supabase as any).from("profiles").update({ approval_notified: true }).eq("id", u.id);
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }
  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{
      user, session, isAdmin,
      isMasterAdmin: (user?.email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL.toLowerCase(),
      accountType, approvalNotice, dismissApprovalNotice,
      loading, signIn, signOut,
    }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
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

/** Preço "cheio" (sem promoção) conforme o tipo de conta. */
export function regularPriceForAccount(p: PriceFields, t: AccountType): number {
  if (t === "produtor" && p.producer_price != null) return Number(p.producer_price);
  return Number(p.consumer_price ?? p.price ?? 0);
}

/** Resolve price field based on user account type. Falls back to consumer/legacy. */
export function priceForAccount(p: PriceFields, t: AccountType): number {
  if (p.on_sale) {
    const sale = t === "produtor"
      ? (p.sale_producer_price ?? p.sale_consumer_price)
      : p.sale_consumer_price;
    if (sale != null) return Number(sale);
  }
  return regularPriceForAccount(p, t);
}

/** True quando o produto está em promoção e tem preço promocional válido para a conta. */
export function isOnSaleForAccount(p: PriceFields, t: AccountType): boolean {
  if (!p.on_sale) return false;
  const sale = t === "produtor"
    ? (p.sale_producer_price ?? p.sale_consumer_price)
    : p.sale_consumer_price;
  return sale != null && Number(sale) < regularPriceForAccount(p, t);
}

/** Resolve PIX price for the user's account type. Returns null if no PIX configured for that tier. */
export function pixPriceForAccount(p: PixFields, t: AccountType): number | null {
  if (p.on_sale) {
    const sale = t === "produtor"
      ? (p.sale_producer_pix_price ?? p.sale_consumer_pix_price)
      : p.sale_consumer_pix_price;
    if (sale != null) return Number(sale);
  }
  let v: number | null | undefined;
  if (t === "produtor") v = p.producer_pix_price;
  else v = p.consumer_pix_price ?? p.pix_price;
  return v != null ? Number(v) : null;
}
