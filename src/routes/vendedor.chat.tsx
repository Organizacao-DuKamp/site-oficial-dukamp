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
import { toast } from "sonner";

export const Route = createFileRoute("/vendedor/chat")({ ssr: false, component: SellerChatPage });

type Conversation = SupportTicket & {
  customer_id: string;
  seller_id: string;
  customer_name: string;
  customer_email: string;
  unread: number;
};

type SellerChatResponse = {
  conversations?: Conversation[];
  selected?: Conversation | null;
  messages?: SupportMessage[];
  ticket?: SupportTicket | null;
  error?: string;
};

async function sellerChatRequest(ticketId?: string, body?: Record<string, unknown>): Promise<SellerChatResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const url = ticketId && !body
    ? `/api/seller/chat?ticketId=${encodeURIComponent(ticketId)}`
    : "/api/seller/chat";
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as SellerChatResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível atualizar a conversa.");
  return payload;
}

function SellerChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const payload = await sellerChatRequest();
      setConversations(payload.conversations ?? []);
    } catch (error) {
      console.error("[seller-chat] Falha ao listar conversas:", error);
    }
  }, [user?.id]);

  const loadSelected = useCallback(async () => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    try {
      const payload = await sellerChatRequest(selectedId);
      setConversations(payload.conversations ?? []);
      setMessages(payload.messages ?? []);
      await sellerChatRequest(undefined, { action: "markRead", ticketId: selectedId });
      setConversations((current) =>
        current.map((item) => (item.id === selectedId ? { ...item, unread: 0 } : item)),
      );
    } catch (error) {
      console.error("[seller-chat] Falha ao abrir conversa:", error);
    }
  }, [selectedId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    void loadSelected();
  }, [loadSelected]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      void loadConversations();
      if (selectedId) void loadSelected();
    }, selectedId ? 4000 : 10000);
    return () => window.clearInterval(interval);
  }, [user?.id, selectedId, loadConversations, loadSelected]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return query
      ? conversations.filter((item) =>
          `${item.customer_name} ${item.customer_email}`.toLocaleLowerCase("pt-BR").includes(query),
        )
      : conversations;
  }, [conversations, search]);

  const selected = conversations.find((item) => item.id === selectedId);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || selected.status === "closed" || !text.trim() || loading) return;
    const message = text.trim();
    setText("");
    setLoading(true);
    try {
      const payload = await sellerChatRequest(undefined, {
        action: "send",
        ticketId: selected.id,
        message,
      });
      setMessages(payload.messages ?? []);
      await loadConversations();
    } catch (error) {
      setText(message);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <MessageSquare className="h-6 w-6" /> Conversas
      </h1>
      <div className="grid min-h-[70vh] overflow-hidden rounded-lg border bg-card lg:grid-cols-[320px_1fr]">
        <aside className="border-b lg:border-b-0 lg:border-r">
          <div className="relative p-3">
            <Search className="absolute left-6 top-6 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente..."
            />
          </div>
          <div className="max-h-72 divide-y overflow-y-auto lg:max-h-[62vh]">
            {!filtered.length && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhuma conversa iniciada. Os clientes vinculados aparecem aqui após enviarem a primeira mensagem.
              </p>
            )}
            {filtered.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                className={`w-full p-3 text-left hover:bg-accent ${selectedId === item.id ? "bg-accent" : ""}`}
              >
                <div className="flex justify-between gap-2">
                  <span className="truncate font-medium">{item.customer_name}</span>
                  {item.unread > 0 && <Badge>{item.unread}</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">{item.customer_email}</p>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-h-[480px] flex-col">
          {!selected ? (
            <div className="grid flex-1 place-items-center text-sm text-muted-foreground">
              Selecione um cliente para ver o histórico.
            </div>
          ) : (
            <>
              <header className="border-b p-3">
                <strong>{selected.customer_name}</strong>
                <p className="text-xs text-muted-foreground">{selected.customer_email}</p>
              </header>
              <MessageList messages={messages} selfRole="admin" />
              <form onSubmit={send} className="flex gap-2 border-t p-3">
                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  disabled={selected.status === "closed" || loading}
                  placeholder={selected.status === "closed" ? "Conversa encerrada" : "Digite sua mensagem..."}
                />
                <Button
                  size="icon"
                  disabled={!text.trim() || selected.status === "closed" || loading}
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
