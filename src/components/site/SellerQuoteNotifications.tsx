import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import {
  markSellerQuoteViewed,
  money,
  respondSellerQuote,
  unreadQuotes,
  type SellerQuote,
} from "@/lib/seller-quotes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SellerQuoteNotifications() {
  const { user, accountType } = useAuth();
  const { replaceItems } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState<SellerQuote | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => new Set());

  const quotes = useQuery({
    queryKey: ["seller-quotes", "unread", user?.id],
    queryFn: unreadQuotes,
    enabled: Boolean(user) && accountType !== "vendedor" && accountType !== "admin",
    staleTime: 30_000,
  });

  useEffect(() => {
    if (current) return;
    const next = quotes.data?.find((quote) => !dismissedIds.has(quote.id));
    if (next) setCurrent(next);
  }, [quotes.data, current, dismissedIds]);

  const viewed = useMutation({
    mutationFn: (id: string) => markSellerQuoteViewed(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-quotes"] }),
  });

  const respond = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondSellerQuote(id, accept),
    onSuccess: async (result, variables) => {
      setDismissedIds((previous) => new Set(previous).add(variables.id));
      setCurrent(null);
      await queryClient.invalidateQueries({ queryKey: ["seller-quotes"] });

      if (variables.accept) {
        if (!result.cartItems.length) {
          toast.error("O orçamento foi aceito, mas não possui itens válidos para o carrinho.");
          return;
        }
        replaceItems(result.cartItems);
        toast.success("Orçamento aceito. Os produtos foram adicionados ao carrinho.");
        navigate({ to: "/carrinho" });
      } else {
        toast.success("Orçamento recusado.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!current) return null;
  const activeQuote = current;

  const total =
    activeQuote.seller_quote_items?.reduce(
      (sum, item) => sum + item.quantity * Number(item.unit_price_snapshot ?? 0),
      0,
    ) ?? 0;

  function dismiss() {
    const id = activeQuote.id;
    setDismissedIds((previous) => new Set(previous).add(id));
    setCurrent(null);
    viewed.mutate(id);
  }


  return (
    <Dialog open onOpenChange={(open) => !open && dismiss()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Novo orçamento
          </DialogTitle>
          <DialogDescription>
            Enviado por {current.seller_name_snapshot || "seu vendedor"}.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-auto rounded-md border p-3">
          {current.seller_quote_items?.map((item) => (
            <div key={item.id} className="flex justify-between gap-4 text-sm">
              <span>{item.quantity}× {item.product_name_snapshot || "Produto"}</span>
              <strong>{money(item.quantity * Number(item.unit_price_snapshot ?? 0))}</strong>
            </div>
          ))}
        </div>

        <div className="flex justify-between gap-4 text-sm">
          <span>Válido até {new Date(current.valid_until).toLocaleString("pt-BR")}</span>
          <strong>Total: {money(total)}</strong>
        </div>
        {current.notes && <p className="rounded-md bg-muted p-3 text-sm">{current.notes}</p>}

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={respond.isPending}
            onClick={() => respond.mutate({ id: current.id, accept: false })}
          >
            Recusar
          </Button>
          <Button
            disabled={respond.isPending}
            onClick={() => respond.mutate({ id: current.id, accept: true })}
          >
            {respond.isPending ? "Processando..." : "Aceitar e ir ao carrinho"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
