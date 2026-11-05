import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type Connection = {
  account_id: string;
  nickname: string;
  status: string;
  expires_at: string;
  last_error: string | null;
};
type Event = {
  id: string;
  topic: string;
  resource: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
};
type Status = {
  configured: boolean;
  missing: string[];
  connections: Connection[];
  events: Event[];
};

const labels: Record<string, string> = {
  connected: "Conectada",
  reconnect_required: "Reconexão necessária",
  disconnected: "Desconectada",
  pending: "Na fila",
  processing: "Consultando",
  retry: "Nova tentativa agendada",
  done: "Confirmada",
  dead: "Revisão necessária",
  ignored: "Ignorada",
};
const results: Record<string, string> = {
  connected: "Conta Mercado Livre conectada com sucesso.",
  access_denied: "A autorização não foi concluída. Você pode iniciar a conexão novamente.",
  invalid_state: "A autorização expirou ou já foi utilizada. Inicie uma nova conexão.",
  invalid_code: "O Mercado Livre não retornou uma autorização válida. Tente conectar novamente.",
  failed:
    "Não foi possível concluir a conexão. Confira as credenciais e as permissões no Mercado Livre e tente novamente.",
};

async function integrationRequest(body?: Record<string, string>) {
  const { data } = await supabase.auth.getSession();
  const response = await fetch("/api/admin/mercado-livre", {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${data.session?.access_token || ""}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar a integração.");
  return payload;
}

export function MercadoLivreIntegration() {
  const { user } = useAuth();
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const status = useQuery<Status>({
    queryKey: ["mercado-livre", user?.id],
    enabled: Boolean(user),
    queryFn: () => integrationRequest(),
    refetchInterval: 30_000,
  });
  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("ml");
    if (result && results[result]) {
      setNotice(results[result]);
      url.searchParams.delete("ml");
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
    }
  }, []);
  const action = useMutation({
    mutationFn: (body: Record<string, string>) => integrationRequest(body),
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        const url = new URL(data.authorizationUrl);
        if (url.origin === "https://auth.mercadolivre.com.br") window.location.assign(url.href);
      } else {
        setNotice("Solicitação concluída.");
        void client.invalidateQueries({ queryKey: ["mercado-livre"] });
      }
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Mercado Livre</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte sua conta e acompanhe as notificações de vendas e anúncios.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void status.refetch()}
          disabled={status.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Atualizar
        </Button>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="font-medium">Consulta e acompanhamento</p>
        <p className="mt-1 text-muted-foreground">
          Os eventos são confirmados no Mercado Livre. A integração ainda não altera pedidos, preços
          ou estoque do ERP.
        </p>
      </div>
      {notice && (
        <p role="status" className="rounded-lg border p-3 text-sm">
          {notice}
        </p>
      )}
      {(status.error || action.error) && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive"
        >
          {(status.error || action.error)?.message}
        </p>
      )}
      {status.isPending ? (
        <p className="text-sm text-muted-foreground">Carregando integração…</p>
      ) : (
        status.data && (
          <>
            {!status.data.configured && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">Configuração pendente</p>
                <p className="mt-1">
                  Configure as credenciais da aplicação na Netlify para habilitar a conexão.
                </p>
                {status.data.missing.length > 0 && (
                  <p className="mt-2 break-all font-mono text-xs">
                    {status.data.missing.join(", ")}
                  </p>
                )}
              </div>
            )}
            <Button
              onClick={() => action.mutate({ action: "connect" })}
              disabled={!status.data.configured || action.isPending}
            >
              <Link2 className="mr-2 h-4 w-4" aria-hidden="true" /> Conectar conta Mercado Livre
            </Button>
            <div className="space-y-3">
              {status.data.connections.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma conta conectada.</p>
              )}
              {status.data.connections.map((connection) => (
                <div
                  key={connection.account_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
                >
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {connection.status === "connected" && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      )}
                      {connection.nickname}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Conta {connection.account_id} ·{" "}
                      {labels[connection.status] || connection.status}
                    </p>
                    {connection.status === "reconnect_required" && (
                      <p className="mt-1 text-sm text-amber-700">
                        Use “Conectar conta Mercado Livre” para autorizar novamente.
                      </p>
                    )}
                  </div>
                  {connection.status !== "disconnected" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={action.isPending}
                      onClick={() => {
                        if (window.confirm(`Desconectar a conta ${connection.nickname} do ERP?`))
                          action.mutate({ action: "disconnect", accountId: connection.account_id });
                      }}
                    >
                      <Unplug className="mr-2 h-4 w-4" aria-hidden="true" /> Desconectar
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <section aria-labelledby="ml-events-title">
              <h3 id="ml-events-title" className="mb-3 font-semibold">
                Últimas notificações
              </h3>
              {status.data.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  As notificações aparecerão aqui após a autorização da conta e a configuração dos
                  tópicos.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="p-3">Evento</th>
                        <th className="p-3">Recebido</th>
                        <th className="p-3">Situação</th>
                        <th className="p-3">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.data.events.map((event) => (
                        <tr key={event.id} className="border-t">
                          <td className="p-3">
                            <p className="font-medium">{event.topic}</p>
                            <p className="text-xs text-muted-foreground">{event.resource}</p>
                          </td>
                          <td className="whitespace-nowrap p-3">
                            {new Date(event.created_at).toLocaleString("pt-BR")}
                          </td>
                          <td className="p-3">
                            <p>{labels[event.status] || event.status}</p>
                            {event.last_error && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {event.last_error}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {["retry", "dead"].includes(event.status) && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={action.isPending || !status.data?.configured}
                                onClick={() =>
                                  action.mutate({ action: "retry", eventId: event.id })
                                }
                              >
                                Reprocessar
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}
