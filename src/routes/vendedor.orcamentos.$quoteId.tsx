import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  money,
  quoteById,
  removeSellerQuoteItem,
  saveSellerQuoteItem,
  sendSellerQuote,
} from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/vendedor/orcamentos/$quoteId")({ component: QuoteDetail });

type QuoteAction =
  | { type: "save"; productId: string; quantity: number }
  | { type: "remove"; productId: string }
  | { type: "send" };

function QuoteDetail() {
  const { quoteId } = Route.useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const quote = useQuery({
    queryKey: ["seller-quote", quoteId],
    queryFn: () => quoteById(quoteId),
  });

  const products = useQuery({
    queryKey: ["quote-products", search],
    enabled: quote.data?.status === "draft",
    queryFn: async () => {
      let request = supabase
        .from("products")
        .select("id,name,code,stock")
        .eq("active", true)
        .gt("stock", 0)
        .limit(20);
      if (search.trim()) request = request.ilike("name", `%${search.trim()}%`);
      const { data, error } = await request.order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["seller-quote", quoteId] }),
      queryClient.invalidateQueries({ queryKey: ["seller-quotes"] }),
    ]);
  };

  const action = useMutation({
    mutationFn: async (operation: QuoteAction) => {
      if (operation.type === "save") {
        return saveSellerQuoteItem(quoteId, operation.productId, operation.quantity);
      }
      if (operation.type === "remove") {
        return removeSellerQuoteItem(quoteId, operation.productId);
      }
      return sendSellerQuote(quoteId);
    },
    onSuccess: async (_, operation) => {
      await refresh();
      if (operation.type === "send") toast.success("Orçamento enviado ao cliente.");
      else if (operation.type === "save") toast.success("Produto adicionado ao orçamento.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (quote.isLoading) return <p>Carregando…</p>;
  if (quote.isError) {
    return <p className="text-destructive">{quote.error instanceof Error ? quote.error.message : "Não foi possível carregar."}</p>;
  }
  if (!quote.data) return <p>Orçamento não encontrado.</p>;

  const current = quote.data;
  const draft = current.status === "draft";
  const total =
    current.seller_quote_items?.reduce(
      (sum, item) => sum + item.quantity * Number(item.unit_price_snapshot ?? 0),
      0,
    ) ?? 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Orçamento para {current.client_name_snapshot || current.client_email_snapshot || "Cliente"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Validade: {new Date(current.valid_until).toLocaleString("pt-BR")}
          </p>
        </div>
        <Badge>{current.status}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Itens</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {current.seller_quote_items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-md border p-3">
              <span>{item.quantity}× {item.product_name_snapshot || "Produto selecionado"}</span>
              <div className="flex items-center gap-3">
                {item.unit_price_snapshot != null && (
                  <strong>{money(item.quantity * Number(item.unit_price_snapshot))}</strong>
                )}
                {draft && (
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={action.isPending}
                    onClick={() => action.mutate({ type: "remove", productId: item.product_id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!current.seller_quote_items?.length && (
            <p className="text-sm text-muted-foreground">Adicione pelo menos um produto.</p>
          )}
          {!draft && <div className="pt-3 text-right text-lg font-bold">Total: {money(total)}</div>}
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader><CardTitle>Adicionar produtos do catálogo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Buscar produto…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {products.isError && (
              <p className="text-sm text-destructive">Não foi possível carregar os produtos.</p>
            )}
            {products.data?.map((product) => {
              const quantity = quantities[product.id] ?? 1;
              return (
                <div key={product.id} className="flex items-center gap-3 rounded-md border p-3">
                  <span className="min-w-0 flex-1 truncate">
                    {product.name} <small className="text-muted-foreground">({product.stock} disponíveis)</small>
                  </span>
                  <Input
                    className="w-20"
                    type="number"
                    min={1}
                    max={product.stock}
                    value={quantity}
                    onChange={(event) =>
                      setQuantities((previous) => ({
                        ...previous,
                        [product.id]: Math.max(1, Number(event.target.value) || 1),
                      }))
                    }
                  />
                  <Button
                    variant="outline"
                    disabled={action.isPending || quantity > Number(product.stock)}
                    onClick={() =>
                      action.mutate({ type: "save", productId: product.id, quantity })
                    }
                  >
                    Adicionar
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {draft && (
        <div className="flex justify-end">
          <Button
            disabled={!current.seller_quote_items?.length || action.isPending}
            onClick={() => action.mutate({ type: "send" })}
          >
            <Send className="mr-2 h-4 w-4" />
            {action.isPending ? "Processando..." : "Validar preços e enviar"}
          </Button>
        </div>
      )}
    </div>
  );
}
