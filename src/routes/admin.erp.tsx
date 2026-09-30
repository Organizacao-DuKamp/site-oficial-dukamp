import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  ClipboardList,
  MapPinned,
  Package,
  Ruler,
  ShoppingCart,
  Tags,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErpProductMaintenance } from "@/components/admin/ErpProductMaintenance";
import { ErpSupplierMaintenance } from "@/components/admin/ErpSupplierMaintenance";
import { ErpPurchaseOrderMaintenance } from "@/components/admin/ErpPurchaseOrderMaintenance";
import { ErpProductUnitMaintenance } from "@/components/admin/ErpProductUnitMaintenance";
import { ErpProductAreaMaintenance } from "@/components/admin/ErpProductAreaMaintenance";
import { ErpDeliveryRouteMaintenance } from "@/components/admin/ErpDeliveryRouteMaintenance";
import { ErpSalesMargin } from "@/components/admin/ErpSalesMargin";

const modules = [
  {
    id: "produtos",
    title: "Produtos e preços",
    description: "Cadastro de produtos e tabela de preços.",
    group: "Cadastros",
    icon: Package,
  },
  {
    id: "fornecedores",
    title: "Fornecedores",
    description: "Consulte e mantenha os fornecedores.",
    group: "Cadastros",
    icon: UsersRound,
  },
  {
    id: "pedidos",
    title: "Pedidos de compra",
    description: "Cadastre e acompanhe pedidos de compra.",
    group: "Cadastros",
    icon: ClipboardList,
  },
  {
    id: "unidades",
    title: "Unidades de medida",
    description: "Defina as unidades usadas nos produtos.",
    group: "Cadastros",
    icon: Ruler,
  },
  {
    id: "areas",
    title: "Áreas e responsáveis",
    description: "Organize as áreas e seus responsáveis.",
    group: "Cadastros",
    icon: Tags,
  },
  {
    id: "roteiros",
    title: "Roteiros de entrega",
    description: "Consulte e edite os roteiros dos clientes.",
    group: "Cadastros",
    icon: MapPinned,
  },
  {
    id: "margem",
    title: "Margem e venda",
    description: "Analise vendas e margens por vendedor.",
    group: "Consultas",
    icon: TrendingUp,
  },
] as const;

type ModuleId = (typeof modules)[number]["id"];

function isModuleId(value: unknown): value is ModuleId {
  return modules.some((module) => module.id === value);
}

export const Route = createFileRoute("/admin/erp")({
  validateSearch: (search: Record<string, unknown>) => ({
    modulo: isModuleId(search.modulo) ? search.modulo : undefined,
  }),
  component: ErpPage,
});

function ModuleContent({ id }: { id: ModuleId }) {
  switch (id) {
    case "produtos":
      return <ErpProductMaintenance />;
    case "fornecedores":
      return <ErpSupplierMaintenance />;
    case "pedidos":
      return <ErpPurchaseOrderMaintenance />;
    case "unidades":
      return <ErpProductUnitMaintenance />;
    case "areas":
      return <ErpProductAreaMaintenance />;
    case "roteiros":
      return <ErpDeliveryRouteMaintenance />;
    case "margem":
      return <ErpSalesMargin />;
  }
}

function ErpPage() {
  const { modulo } = Route.useSearch();
  const active = modules.find((module) => module.id === modulo);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-sm sm:p-7">
        {active && (
          <nav
            aria-label="Caminho no ERP"
            className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          >
            <Link
              to="/admin/erp"
              search={{ modulo: undefined }}
              className="hover:text-foreground hover:underline"
            >
              ERP
            </Link>
            <span aria-hidden="true">/</span>
            <span>Compras</span>
            <span aria-hidden="true">/</span>
            <span>{active.group}</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-foreground">{active.title}</span>
          </nav>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-background/70 px-3 py-1 text-xs font-semibold text-primary">
              <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> Compras
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {active?.title ?? "ERP"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {active?.description ?? "Acesse os cadastros e consultas de compras."}
            </p>
          </div>
          {active && (
            <Button
              asChild
              variant="outline"
              size="sm"
              className="shrink-0 self-start bg-background/80"
            >
              <Link to="/admin/erp" search={{ modulo: undefined }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Voltar ao ERP
              </Link>
            </Button>
          )}
        </div>
      </header>

      {active ? (
        <>
          <nav aria-label="Ferramentas do ERP" className="flex gap-2 overflow-x-auto pb-1">
            {modules.map((module) => (
              <Link
                key={module.id}
                to="/admin/erp"
                search={{ modulo: module.id }}
                aria-current={module.id === modulo ? "page" : undefined}
                className={
                  "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
                  (module.id === modulo
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
                }
              >
                {module.title}
              </Link>
            ))}
          </nav>
          <section
            aria-label={active.title}
            className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6"
          >
            <ModuleContent key={active.id} id={active.id} />
          </section>
        </>
      ) : (
        <div className="space-y-7">
          {(["Cadastros", "Consultas"] as const).map((group) => (
            <section key={group} aria-labelledby={"erp-" + group}>
              <h2 id={"erp-" + group} className="mb-3 text-lg font-semibold">
                {group}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {modules
                  .filter((module) => module.group === group)
                  .map((module) => (
                    <Link
                      key={module.id}
                      to="/admin/erp"
                      search={{ modulo: module.id }}
                      className="group flex min-h-32 flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                          <module.icon className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <ArrowUpRight
                          className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </div>
                      <div className="mt-4">
                        <h3 className="font-semibold">{module.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      </div>
                    </Link>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
