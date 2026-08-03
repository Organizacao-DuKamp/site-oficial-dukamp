import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { sellerQuotes } from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/vendedor/orcamentos/")({
  component: QuoteList,
  head: () => ({ meta: [{ title: "Orçamentos — Vendedor Dukamp" }] }),
});

const labels = {
  draft: "Rascunho",
  sent: "Enviado",
  accepted: "Aceito",
  declined: "Recusado",
  expired: "Vencido",
} as const;

function QuoteList() {
  const query = useQuery({ queryKey: ["seller-quotes"], queryFn: sellerQuotes });

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-sm text-muted-foreground">
            Crie propostas com produtos, estoque e preços validados no envio.
          </p>
        </div>
        <Button asChild>
          <Link to="/vendedor/orcamentos/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo
          </Link>
        </Button>
      </div>

      {query.isLoading && <p>Carregando…</p>}
      {query.isError && (
        <div className="rounded-md border border-destructive/50 p-4 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Não foi possível carregar os orçamentos."}
        </div>
      )}

      <div className="space-y-3">
        {query.data?.map((quote) => (
          <Link
            key={quote.id}
            to="/vendedor/orcamentos/$quoteId"
            params={{ quoteId: quote.id }}
          >
            <Card className="transition hover:border-primary">
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <strong>
                    {quote.client_name_snapshot || quote.client_email_snapshot || "Cliente"}
                  </strong>
                  <p className="text-xs text-muted-foreground">
                    Criado em {new Date(quote.created_at).toLocaleDateString("pt-BR")} ·{" "}
                    {quote.seller_quote_items?.length ?? 0} itens
                  </p>
                </div>
                <Badge variant={quote.status === "accepted" ? "default" : "secondary"}>
                  {labels[quote.status]}
                </Badge>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {!query.isLoading && !query.isError && !query.data?.length && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum orçamento criado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
