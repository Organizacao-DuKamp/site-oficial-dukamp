import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type TicketStatus = "open" | "in_progress" | "closed";

export type SupportTicket = {
  id: string;
  user_id: string;
  status: TicketStatus;
  last_message_at: string;
  closed_at: string | null;
  created_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: "user" | "admin";
  message: string;
  read_by_user: boolean;
  read_by_admin: boolean;
  created_at: string;
};

type Ctx = {
  ticket: SupportTicket | null;
  messages: SupportMessage[];
  open: boolean;
  unread: number;
  loading: boolean;
  startTicket: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  closeTicket: () => Promise<void>;
  openChat: () => void;
  closeChat: () => void;
};

const SupportCtx = createContext<Ctx | null>(null);

const STORAGE_KEY = "dukamp_chat_open";

export function SupportProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const active = !!user && !isAdmin;

  // restore open state
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
  }, [open]);

  // fetch active ticket
  useEffect(() => {
    if (!active || !user) {
      setTicket(null);
      setMessages([]);
      return;
    }
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancel) return;
      setTicket((data as SupportTicket | null) ?? null);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [active, user]);

  // load messages + realtime for ticket
  useEffect(() => {
    if (!ticket) {
      setMessages([]);
      return;
    }
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (cancel) return;
      setMessages((data as SupportMessage[]) ?? []);
    })();

    const ch = supabase
      .channel(`support_ticket_${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticket.id}` },
        (payload) => {
          setMessages((prev) => {
            const m = payload.new as SupportMessage;
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticket.id}` },
        (payload) => setTicket(payload.new as SupportTicket),
      )
      .subscribe();

    return () => {
      cancel = true;
      supabase.removeChannel(ch);
    };
  }, [ticket?.id]);

  // mark admin messages as read while chat is open
  useEffect(() => {
    if (!open || !ticket || !user) return;
    const unreadIds = messages.filter((m) => m.sender_role === "admin" && !m.read_by_user).map((m) => m.id);
    if (unreadIds.length === 0) return;
    (supabase as any)
      .from("support_messages")
      .update({ read_by_user: true })
      .in("id", unreadIds)
      .then(() => {});
  }, [open, messages, ticket, user]);

  const unread = messages.filter((m) => m.sender_role === "admin" && !m.read_by_user).length;

  const startTicket = useCallback(async () => {
    if (!user || ticket) return;
    const { data, error } = await (supabase as any)
      .from("support_tickets")
      .insert({ user_id: user.id, status: "open" })
      .select()
      .single();
    if (!error && data) {
      setTicket(data as SupportTicket);
      setOpen(true);
    }
  }, [user, ticket]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!user || !ticket || ticket.status === "closed" || !text.trim()) return;
      await (supabase as any).from("support_messages").insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        sender_role: "user",
        message: text.trim(),
      });
    },
    [user, ticket],
  );

  const closeTicket = useCallback(async () => {
    if (!ticket || !user) return;
    await (supabase as any)
      .from("support_tickets")
      .update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() })
      .eq("id", ticket.id);
    setTicket((t) => (t ? { ...t, status: "closed" } : t));
  }, [ticket, user]);

  return (
    <SupportCtx.Provider
      value={{
        ticket,
        messages,
        open,
        unread,
        loading,
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
  const c = useContext(SupportCtx);
  if (!c) throw new Error("useSupport must be inside SupportProvider");
  return c;
}
