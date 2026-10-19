import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { adminPartnerData, partnerBootstrap, partnerProducts } from "@/lib/partners.functions";
import { formatBRL } from "@/lib/cart";
import type { PartnerSummary } from "@/lib/partners";
import type { ReactNode } from "react";
import { AlertCircle, Package, Store, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

export function usePartnerData() {
  const { user } = useAuth();
  const fetch = useServerFn(partnerBootstrap);
  return useQuery({
    queryKey: ["partner-area", user?.id],
    queryFn: () => fetch(),
    enabled: !!user,
    retry: false,
  });
}
export function useAdminPartnerData() {
  const { user, isAdmin } = useAuth();
  const fetch = useServerFn(adminPartnerData);
  return useQuery({
    queryKey: ["admin-partners", user?.id],
    queryFn: () => fetch(),
    enabled: !!user && isAdmin,
  });
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <div className="flex items-center gap-2 font-medium text-destructive">
        <AlertCircle className="h-5 w-5" />
        Não foi possível carregar
      </div>
      <p className="mt-2 text-sm">
        {error instanceof Error ? error.message : "Tente novamente em instantes."}
      </p>
      {retry && (
        <Button className="mt-3" variant="outline" onClick={retry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
export function SummaryCards({
  summaries,
  partners,
}: {
  summaries: PartnerSummary[];
  partners?: number;
}) {
  const sum = (field: keyof PartnerSummary) =>
    summaries.reduce((n, s) => n + Number(s[field] || 0), 0);
  const cards = [
    {
      label: partners == null ? "Pedidos pagos" : "Parceiros ativos",
      value: partners == null ? sum("paid_orders") : partners,
      icon: partners == null ? Package : Store,
    },
    { label: "Faturamento comercial", value: formatBRL(sum("gross_total")), icon: TrendingUp },
    { label: "Comissões reconhecidas", value: formatBRL(sum("commission_total")), icon: Wallet },
    { label: "Pagamentos à Dukamp", value: formatBRL(sum("dukamp_total")), icon: Package },
  ];
  return (
    <>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.label}</span>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{c.value}</div>
          </div>
        ))}
      </div>
      <p className="mb-6 text-xs text-muted-foreground">
        Totais de vendas com pagamento aprovado. Cancelamentos e solicitações de reembolso não geram
        comissão. Taxas de cartão entram no pagamento à Dukamp e não na comissão.
      </p>
    </>
  );
}
export const fieldClass =
  "h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-muted";
export function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {required ? " *" : ""}
      {children}
    </label>
  );
}
export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function usePartnerProducts() {
  const { user } = useAuth();
  const fetch = useServerFn(partnerProducts);
  return useQuery({
    queryKey: ["partner-products", user?.id],
    queryFn: () => fetch(),
    enabled: !!user,
    refetchOnWindowFocus: true,
  });
}
