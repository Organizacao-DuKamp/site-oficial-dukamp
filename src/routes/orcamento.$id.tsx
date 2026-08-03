import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { acceptSalesQuote } from "@/lib/sales-quotes";

export const Route = createFileRoute("/orcamento/$id")({
  ssr: false,
  head: () => ({ meta: [{ title: "Aceitar orçamento — Dukamp" }] }),
  component: AcceptQuotePage,
});

function AcceptQuotePage() {
  const { id } = Route.useParams();
  const { items, replaceItems } = useCart();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);

  async function accept() {
    if (items.length > 0 && !window.confirm("Seu carrinho atual será substituído pelos itens deste orçamento. Deseja continuar?")) {
      return;
    }

    setAccepting(true);
    try {
      const result = await acceptSalesQuote(id);
      // One update, only after the authoritative transaction has succeeded.
      replaceItems(result.items);
      toast.success(result.alreadyAccepted ? "Orçamento já aceito. Carrinho restaurado." : "Orçamento aceito e carrinho atualizado.");
      navigate({ to: "/carrinho" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aceitar o orçamento.", { duration: 7000 });
    } finally {
      setAccepting(false);
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl py-14 text-center">
        <FileCheck2 className="mx-auto mb-4 h-14 w-14 text-primary" />
        <h1 className="text-2xl font-bold">Aceitar orçamento</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Antes de montar seu carrinho, confirmaremos a validade, os preços e o estoque de todos os produtos.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Button variant="outline" asChild><Link to="/produtos">Voltar</Link></Button>
          <Button onClick={accept} disabled={accepting}>
            {accepting && <Loader2 className="h-4 w-4 animate-spin" />}
            {accepting ? "Validando…" : "Aceitar orçamento"}
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
