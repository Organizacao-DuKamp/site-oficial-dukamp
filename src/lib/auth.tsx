import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isMasterAdminUserId } from "@/lib/constants";
import { createAuthSessionHandler } from "@/lib/auth-session";
export { regularPriceForAccount, priceForAccount, isOnSaleForAccount, pixPriceForAccount } from "@/lib/pricing";

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

async function readAdminRole(userId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!error) return Boolean(data);
    if (attempt === 2) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
  }
  return false;
}

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
    let authEventReceived = false;
    let stopped = false;
    const handler = createAuthSessionHandler({
      setSession: nextSession => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      },
      setLoading,
      clearProfile: () => {
        setIsAdmin(false);
        setAccountType("cliente");
        setApprovalNotice(null);
      },
      loadProfile: (nextSession, isCurrent) => loadProfile(nextSession.user, nextSession.access_token, isCurrent),
      onError: error => console.error("[auth] Falha ao carregar permissões:", error),
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      handler.handle(nextSession);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!stopped && !authEventReceived) handler.handle(data.session);
    }).catch((error) => {
      console.error("[auth] Falha ao carregar sessão:", error);
      if (!stopped && !authEventReceived) setLoading(false);
    });

    return () => {
      stopped = true;
      handler.dispose();
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isAdmin || !session?.access_token) return;
    let stopped = false;
    async function recordLogin() {
      const response = await fetch("/api/admin/audit", { method: "POST", headers: { Authorization: `Bearer ${session!.access_token}` } });
      if (!response.ok) throw new Error("Falha ao registrar o acesso administrativo");
    }
    void recordLogin().catch(error => { if (!stopped) console.error("[audit]", error); });
    return () => { stopped = true; };
  }, [isAdmin, session?.access_token]);

  async function loadProfile(authUser: User, accessToken?: string, isCurrent: () => boolean = () => true) {
    const [admin, profileResult, sellerRole] = await Promise.all([
      readAdminRole(authUser.id),
      (supabase as any)
        .from("profiles")
        .select("account_type, approval_notified")
        .eq("id", authUser.id)
        .maybeSingle(),
      hasProtectedSellerRole(accessToken),
    ]);

    if (!isCurrent()) return;
    setIsAdmin(admin);

    const profile: any = profileResult.data ?? {};
    const profileType = (profile.account_type ?? "cliente") as AccountType;
    const effectiveType: AccountType = admin ? "admin" : sellerRole ? "vendedor" : profileType;

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
        isMasterAdmin: isMasterAdminUserId(user?.id),
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
