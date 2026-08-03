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

type TicketsResponse = {
  tickets?: TicketRow[];
  error?: string;
};

function AtendimentosPage() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [search, setSearch] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");

  async function load() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;

    const response = await fetch("/api/admin/support-tickets", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => ({}))) as TicketsResponse;
    if (!response.ok) {
      setLoadError(payload.error || "Não foi possível carregar os atendimentos.");
      return;
    }

    setLoadError("");
    const rows = payload.tickets ?? [];
    setTickets(rows);
    setOpenIds((current) => current.filter((id) => rows.some((ticket) => ticket.id === id)));
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin_tickets_feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_messages" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = query
      ? tickets.filter(
          (ticket) =>
            (ticket.user_name ?? "").toLowerCase().includes(query) ||
            (ticket.user_email ?? "").toLowerCase().includes(query),
        )
      : tickets;
    return [...rows].sort((first, second) => {
      const firstPriority = first.status === "open" ? 0 : first.status === "in_progress" ? 1 : 2;
      const secondPriority = second.status === "open" ? 0 : second.status === "in_progress" ? 1 : 2;
      if (firstPriority !== secondPriority) return firstPriority - secondPriority;
      return new Date(second.last_message_at).getTime() - new Date(first.last_message_at).getTime();
    });
  }, [tickets, search]);

  const openTickets = openIds
    .map((id) => tickets.find((ticket) => ticket.id === id))
    .filter(Boolean) as TicketRow[];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6" /> Atendimentos
        </h1>
      </div>

      {loadError && (
        <div className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <div className="min-w-0 space-y-2">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="max-h-[40vh] divide-y overflow-y-auto rounded-lg border bg-card lg:max-h-[70vh]">
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum atendimento.
              </div>
            )}
            {filtered.map((ticket) => {
              const isOpen = openIds.includes(ticket.id);
              return (
                <button
                  key={ticket.id}
                  onClick={() =>
                    setOpenIds((current) =>
                      current.includes(ticket.id) ? current : [...current, ticket.id],
                    )
                  }
                  className={`flex w-full flex-col gap-1 p-3 text-left hover:bg-accent ${isOpen ? "bg-accent/50" : ""}`}
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium">
                      {ticket.user_name || ticket.user_email || ticket.user_id.slice(0, 8)}
                    </span>
                    {ticket.unread > 0 && (
                      <Badge className="shrink-0 bg-destructive text-destructive-foreground">
                        {ticket.unread}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <StatusBadge status={ticket.status} />
                    <span className="truncate">
                      {new Date(ticket.last_message_at).toLocaleString("pt-BR")}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-4 xl:grid-cols-2">
          {openTickets.length === 0 && (
            <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground sm:p-10 xl:col-span-2">
              Selecione um atendimento para responder.
            </div>
          )}
          {openTickets.map((ticket) => (
            <AdminChatPanel
              key={ticket.id}
              ticket={ticket}
              onClose={() =>
                setOpenIds((current) => current.filter((id) => id !== ticket.id))
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  if (status === "open") return <span className="font-medium text-red-600">Não respondido</span>;
  if (status === "in_progress") return <span className="font-medium text-amber-600">Em atendimento</span>;
  return <span className="text-muted-foreground">Finalizado</span>;
}
