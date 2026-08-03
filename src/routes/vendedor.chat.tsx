import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { SupportMessage, SupportTicket } from "@/lib/support";
import { MessageList } from "@/components/support/MessageList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/vendedor/chat")({ ssr: false, component: SellerChatPage });

type Conversation = SupportTicket & { customer_name: string; customer_email: string; unread: number };

function SellerChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: seller } = await (supabase as any).from("sellers").select("id").eq("user_id", user.id).maybeSingle();
    if (!seller) { setConversations([]); return; }
    const { data: rows } = await (supabase as any).from("support_tickets").select("*").eq("seller_id", seller.id).order("last_message_at", { ascending: false });
    const tickets = (rows ?? []) as SupportTicket[];
    const customerIds = [...new Set(tickets.map((ticket) => ticket.customer_id).filter(Boolean))];
    const [{ data: profiles }, { data: unread }] = await Promise.all([
      customerIds.length ? (supabase as any).from("profiles").select("id,full_name,email").in("id", customerIds) : Promise.resolve({ data: [] }),
      tickets.length ? (supabase as any).from("support_messages").select("ticket_id").eq("read_by_seller", false).in("ticket_id", tickets.map((ticket) => ticket.id)) : Promise.resolve({ data: [] }),
    ]);
    const profileMap = new Map((profiles ?? []).map((profile: any) => [profile.id, profile]));
    const counts = new Map<string, number>();
    for (const message of unread ?? []) counts.set(message.ticket_id, (counts.get(message.ticket_id) ?? 0) + 1);
    setConversations(tickets.map((ticket) => {
      const profile: any = profileMap.get(ticket.customer_id);
      return { ...ticket, customer_name: profile?.full_name || "Cliente", customer_email: profile?.email || "", unread: counts.get(ticket.id) ?? 0 };
    }));
  }, [user]);

  const loadMessages = useCallback(async () => {
    if (!selectedId) { setMessages([]); return; }
    const { data } = await (supabase as any).from("support_messages").select("*").eq("ticket_id", selectedId).order("created_at");
    setMessages(data ?? []);
    await (supabase as any).from("support_messages").update({ read_by_seller: true, read_by_admin: true }).eq("ticket_id", selectedId).eq("read_by_seller", false);
    setConversations((current) => current.map((item) => item.id === selectedId ? { ...item, unread: 0 } : item));
  }, [selectedId]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);
  useEffect(() => { void loadMessages(); }, [loadMessages]);
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel(`seller_chat_${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => void loadConversations())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => { void loadConversations(); void loadMessages(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, loadConversations, loadMessages]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return query ? conversations.filter((item) => `${item.customer_name} ${item.customer_email}`.toLocaleLowerCase("pt-BR").includes(query)) : conversations;
  }, [conversations, search]);
  const selected = conversations.find((item) => item.id === selectedId);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || selected.status === "closed" || !text.trim()) return;
    const message = text.trim(); setText("");
    await (supabase as any).from("support_messages").insert({ ticket_id: selected.id, message });
  }

  return <div className="space-y-4">
    <h1 className="flex items-center gap-2 text-2xl font-bold"><MessageSquare className="h-6 w-6" /> Conversas</h1>
    <div className="grid min-h-[70vh] overflow-hidden rounded-lg border bg-card lg:grid-cols-[320px_1fr]">
      <aside className="border-b lg:border-b-0 lg:border-r">
        <div className="relative p-3"><Search className="absolute left-6 top-6 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente..." /></div>
        <div className="max-h-72 overflow-y-auto divide-y lg:max-h-[62vh]">
          {!filtered.length && <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma conversa.</p>}
          {filtered.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full p-3 text-left hover:bg-accent ${selectedId === item.id ? "bg-accent" : ""}`}>
            <div className="flex justify-between gap-2"><span className="truncate font-medium">{item.customer_name}</span>{item.unread > 0 && <Badge>{item.unread}</Badge>}</div>
            <p className="truncate text-xs text-muted-foreground">{item.customer_email}</p>
          </button>)}
        </div>
      </aside>
      <section className="flex min-h-[480px] flex-col">
        {!selected ? <div className="grid flex-1 place-items-center text-sm text-muted-foreground">Selecione um cliente para ver o histórico.</div> : <>
          <header className="border-b p-3"><strong>{selected.customer_name}</strong><p className="text-xs text-muted-foreground">{selected.customer_email}</p></header>
          <MessageList messages={messages} selfRole="seller" />
          <form onSubmit={send} className="flex gap-2 border-t p-3"><Input value={text} onChange={(event) => setText(event.target.value)} disabled={selected.status === "closed"} placeholder={selected.status === "closed" ? "Conversa encerrada" : "Digite sua mensagem..."} /><Button size="icon" disabled={!text.trim() || selected.status === "closed"} aria-label="Enviar"><Send className="h-4 w-4" /></Button></form>
        </>}
      </section>
    </div>
  </div>;
}
