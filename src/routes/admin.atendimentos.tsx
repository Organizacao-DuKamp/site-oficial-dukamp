import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminChatPanel } from "@/components/support/AdminChatPanel";
import type { SupportTicket } from "@/lib/support";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/admin/atendimentos")({
  ssr: false,
  component: AtendimentosPage,
});

type TicketRow = SupportTicket & {
  unread: number;
  user_name: string | null;
  user_email: string | null;
};

function AtendimentosPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);

  async function load() {
    const { data: ts } = await (supabase as any)
      .from("support_tickets")
      .select("*")
      .order("last_message_at", { ascending: false });
    const arr = (ts as SupportTicket[]) ?? [];
    const userIds = Array.from(new Set(arr.map((t) => t.user_id)));
    const [{ data: profs }, { data: unreadMsgs }] = await Promise.all([
      userIds.length
        ? (supabase as any).from("profiles").select("id, full_name, email").in("id", userIds)
        : Promise.resolve({ data: [] as any[] }),
      (supabase as any)
        .from("support_messages")
        .select("ticket_id")
        .eq("sender_role", "user")
        .eq("read_by_admin", false),
    ]);
    const pmap = new Map((profs ?? []).map((p: any) => [p.id, p]));
    const counts = new Map<string, number>();
    for (const m of (unreadMsgs as any[]) ?? []) {
      counts.set(m.ticket_id, (counts.get(m.ticket_id) ?? 0) + 1);
    }
    setTickets(
      arr.map((t) => ({
        ...t,
        unread: counts.get(t.id) ?? 0,
        user_name: (pmap.get(t.user_id) as any)?.full_name ?? null,
        user_email: (pmap.get(t.user_id) as any)?.email ?? null,
      })),
    );
  }

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin_tickets_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const arr = q
      ? tickets.filter(
          (t) =>
            (t.user_name ?? "").toLowerCase().includes(q) ||
            (t.user_email ?? "").toLowerCase().includes(q),
        )
      : tickets;
    return [...arr].sort((a, b) => {
      const pa = a.status === "open" ? 0 : a.status === "in_progress" ? 1 : 2;
      const pb = b.status === "open" ? 0 : b.status === "in_progress" ? 1 : 2;
      if (pa !== pb) return pa - pb;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }, [tickets, search]);

  const openTickets = openIds
    .map((id) => tickets.find((t) => t.id === id))
    .filter(Boolean) as TicketRow[];

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" /> Atendimentos
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-w-0">
        <div className="space-y-2 min-w-0">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="border rounded-lg bg-card divide-y max-h-[40vh] lg:max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">Nenhum atendimento.</div>
            )}
            {filtered.map((t) => {
              const isOpen = openIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() =>
                    setOpenIds((prev) =>
                      prev.includes(t.id) ? prev : [...prev, t.id],
                    )
                  }
                  className={`w-full text-left p-3 hover:bg-accent flex flex-col gap-1 ${isOpen ? "bg-accent/50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-sm font-medium truncate min-w-0">
                      {t.user_name || t.user_email || t.user_id.slice(0, 8)}
                    </span>
                    {t.unread > 0 && (
                      <Badge className="bg-destructive text-destructive-foreground shrink-0">{t.unread}</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-2">
                    <StatusBadge status={t.status} />
                    <span className="truncate">{new Date(t.last_message_at).toLocaleString("pt-BR")}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 content-start min-w-0">
          {openTickets.length === 0 && (
            <div className="xl:col-span-2 border rounded-lg bg-card p-6 sm:p-10 text-center text-sm text-muted-foreground">
              Selecione um atendimento para responder.
            </div>
          )}
          {openTickets.map((t) => (
            <AdminChatPanel
              key={t.id}
              ticket={t}
              onClose={() => setOpenIds((prev) => prev.filter((id) => id !== t.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  if (status === "open") return <span className="text-red-600 font-medium">Não respondido</span>;
  if (status === "in_progress") return <span className="text-amber-600 font-medium">Em atendimento</span>;
  return <span className="text-muted-foreground">Finalizado</span>;
}
