import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type TicketStatus = "open" | "in_progress" | "closed";

export type SupportTicket = {
  id: string;
  user_id: string;
  customer_id?: string | null;
  seller_id?: string | null;
  status: TicketStatus;
  last_message_at: string;
  closed_at: string | null;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "customer" | "seller" | "admin";
  message: string;
  read_by_user: boolean;
  read_by_admin: boolean;
  read_by_customer?: boolean;
  read_by_seller?: boolean;
  created_at: string;
};

type ChatResponse = {
  ok?: boolean;
  seller: { id: string; name: string } | null;
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  error?: string;
};

type Ctx = {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  open: boolean;
  unread: number;
  loading: boolean;
  seller: { id: string; name: string } | null;
  startTicket: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  closeTicket: () => Promise<void>;
  openChat: () => void;
  closeChat: () => void;
};

const SupportCtx = createContext<Ctx | null>(null);
const STORAGE_KEY = "dukamp_chat_open";

async function chatRequest(body?: Record<string, unknown>): Promise<ChatResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const response = await fetch("/api/account/seller-chat", {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as ChatResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a conversa.");
  return {
    seller: payload.seller ?? null,
    ticket: payload.ticket ?? null,
    messages: payload.messages ?? [],
    ok: payload.ok,
  };
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, accountType } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seller, setSeller] = useState<{ id: string; name: string } | null>(null);

  const active = Boolean(user) && !isAdmin && accountType !== "vendedor";

  const applyResponse = useCallback((response: ChatResponse) => {
    setSeller(response.seller ?? null);
    setTicket(response.ticket ?? null);
    setMessages(response.messages ?? []);
  }, []);

  const refresh = useCallback(async () => {
    if (!active || !user) {
      setSeller(null);
      setTicket(null);
      setMessages([]);
      return;
    }

    try {
      applyResponse(await chatRequest());
    } catch (error) {
      console.error("[support] Falha ao carregar chat:", error);
    }
  }, [active, user, applyResponse]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const response = active && user ? await chatRequest() : null;
        if (!cancelled) {
          if (response) applyResponse(response);
          else {
            setSeller(null);
            setTicket(null);
            setMessages([]);
          }
        }
      } catch (error) {
        if (!cancelled) console.error("[support] Falha ao iniciar chat:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, user?.id, applyResponse]);

  useEffect(() => {
    if (!active || !user) return;
    const interval = window.setInterval(() => void refresh(), open ? 4000 : 12000);
    return () => window.clearInterval(interval);
  }, [active, user?.id, open, refresh]);

  const unread = useMemo(
    () => messages.filter((message) => message.sender_role === "admin" && !message.read_by_user).length,
    [messages],
  );

  useEffect(() => {
    if (!open || !ticket || unread === 0) return;
    void chatRequest({ action: "markRead" })
      .then(applyResponse)
      .catch((error) => console.error("[support] Falha ao marcar mensagens:", error));
  }, [open, ticket?.id, unread, applyResponse]);

  const startTicket = useCallback(async () => {
    if (!user || !seller || (ticket && ticket.status !== "closed")) return;
    setLoading(true);
    try {
      applyResponse(await chatRequest({ action: "start" }));
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, [user, seller, ticket, applyResponse]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !ticket || ticket.status === "closed" || !text.trim()) return;
      applyResponse(await chatRequest({ action: "send", message: text.trim() }));
    },
    [user, ticket, applyResponse],
  );

  const closeTicket = useCallback(async () => {
    if (!ticket || !user) return;
    applyResponse(await chatRequest({ action: "close" }));
  }, [ticket, user, applyResponse]);

  return (
    <SupportCtx.Provider
      value={{
        ticket,
        messages,
        open,
        unread,
        loading,
        seller,
        startTicket,
        sendMessage,
        closeTicket,
        openChat: () => setOpen(true),
        closeChat: () => setOpen(false),
      }}
    >
      {children}
    </SupportCtx.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportCtx);
  if (!context) throw new Error("useSupport must be inside SupportProvider");
  return context;
}
