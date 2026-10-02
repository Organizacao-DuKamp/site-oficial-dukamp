import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { MessageList } from "./MessageList";
import type { SupportMessage, SupportTicket } from "@/lib/support";

type Props = {
  ticket: SupportTicket;
  onClose: () => void;
};

export function AdminChatPanel({ ticket: initial, onClose }: Props) {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket>(initial);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTicket(initial);
  }, [initial.id]);

  async function chatRequest(action?: string, message?: string) {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Sessão expirada. Entre novamente.");
    const response = await fetch(
      action ? "/api/admin/support-tickets" : `/api/admin/support-tickets?ticketId=${initial.id}`,
      {
        method: action ? "POST" : "GET",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        ...(action ? { body: JSON.stringify({ ticketId: initial.id, action, message }) } : {}),
        cache: "no-store",
      },
    );
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar o atendimento.");
    return payload;
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await chatRequest();
        if (cancelled) return;
        setTicket(payload.ticket);
        setMessages(payload.messages || []);
        setError("");
        if (
          payload.messages?.some(
            (m: SupportMessage) =>
              (m.sender_role === "user" || m.sender_role === "customer") && !m.read_by_admin,
          )
        ) {
          await chatRequest("read");
        }
      } catch (error) {
        if (!cancelled) setError((error as Error).message);
      }
    }
    void load();
    const polling = window.setInterval(() => void load(), 4000);
    const channel = supabase
      .channel(`admin_ticket_${initial.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${initial.id}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "support_tickets",
          filter: `id=eq.${initial.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [initial.id]);

  const isClosed = ticket.status === "closed";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || isClosed || busy) return;
    setBusy(true);
    try {
      await chatRequest("send", text.trim());
      setText("");
      const payload = await chatRequest();
      setMessages(payload.messages || []);
      setTicket(payload.ticket);
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onCloseTicket() {
    if (!user || busy) return;
    setBusy(true);
    try {
      await chatRequest("close");
      setTicket((previous) => ({ ...previous, status: "closed" }));
      setError("");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border rounded-lg bg-card flex flex-col h-[70vh] sm:h-[500px] min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-sm font-semibold truncate">Ticket #{ticket.id.slice(0, 8)}</div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <Button size="sm" variant="outline" onClick={onCloseTicket} disabled={busy}>
              Encerrar
            </Button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-accent rounded" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <MessageList messages={messages} selfRole="admin" />
      <form onSubmit={onSend} className="border-t p-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isClosed ? "Atendimento encerrado" : "Responder..."}
          disabled={isClosed}
        />
        <Button type="submit" size="sm" disabled={busy || isClosed || !text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
