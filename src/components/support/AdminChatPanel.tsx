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

  useEffect(() => {
    setTicket(initial);
  }, [initial.id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });
      if (cancel) return;
      setMessages((data as SupportMessage[]) ?? []);
      // mark as read by admin
      const unreadIds = ((data as SupportMessage[]) ?? [])
        .filter((m) => m.sender_role === "user" && !m.read_by_admin)
        .map((m) => m.id);
      if (unreadIds.length) {
        await (supabase as any).from("support_messages").update({ read_by_admin: true }).in("id", unreadIds);
      }
    })();
    const ch = supabase
      .channel(`admin_ticket_${ticket.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `ticket_id=eq.${ticket.id}` },
        (p) => {
          const m = p.new as SupportMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_role === "user") {
            (supabase as any).from("support_messages").update({ read_by_admin: true }).eq("id", m.id).then(() => {});
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_tickets", filter: `id=eq.${ticket.id}` },
        (p) => setTicket(p.new as SupportTicket),
      )
      .subscribe();
    return () => {
      cancel = true;
      supabase.removeChannel(ch);
    };
  }, [ticket.id]);

  const isClosed = ticket.status === "closed";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user || isClosed) return;
    await (supabase as any).from("support_messages").insert({
      ticket_id: ticket.id,
      sender_id: user.id,
      sender_role: "admin",
      message: text.trim(),
    });
    setText("");
  }

  async function onCloseTicket() {
    if (!user) return;
    await (supabase as any)
      .from("support_tickets")
      .update({ status: "closed", closed_by: user.id, closed_at: new Date().toISOString() })
      .eq("id", ticket.id);
  }

  return (
    <div className="border rounded-lg bg-card flex flex-col h-[70vh] sm:h-[500px] min-w-0 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-sm font-semibold truncate">Ticket #{ticket.id.slice(0, 8)}</div>
        <div className="flex items-center gap-2">
          {!isClosed && (
            <Button size="sm" variant="outline" onClick={onCloseTicket}>
              Encerrar
            </Button>
          )}
          <button onClick={onClose} className="p-1 hover:bg-accent rounded" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <MessageList messages={messages} selfRole="admin" />
      <form onSubmit={onSend} className="border-t p-2 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isClosed ? "Atendimento encerrado" : "Responder..."}
          disabled={isClosed}
        />
        <Button type="submit" size="sm" disabled={isClosed || !text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
