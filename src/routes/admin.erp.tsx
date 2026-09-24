import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronRight, ClipboardList, Database, FileText, Search, Settings2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin/erp")({
  component: ErpPage,
});

type Section = "inicio" | "compras" | "cadastros" | "relatorios" | "consultas" | "operacoes";

const purchaseEntries: Record<"cadastros" | "relatorios" | "consultas", string[]> = {
  cadastros: [
    "Tabela Preço/Produto",
    "Fornecedores",
    "Pedidos Compra",
    "Falta/Novas Mercadorias",
    "Agenda Vendedores",
    "Índices Preço/Vlrs Compras",
    "Metas Vendas Produtos",
    "Unidades Medidas Produtos",
    "Metas Pagamentos Compras",
    "Áreas Produtos/Responsável",
    "Roteiro de Entrega",
  ],
  relatorios: [
    "Tabela Preço",
    "Produtos/Sugestão Compras",
    "Vendas/Premiação Clie/Prod",
    "Curva ABC Fornec/Prod/Grupo",
    "Prod Custo/Venda",
    "Curva ABC Vendedor/Clientes",
    "Vendas/Premiação Pedidos",
    "Compras Produtos PIS/COFINS",
    "Produtos em Promoção",
    "Curva ABC Compras",
    "Roteiro de Entrega",
  ],
  consultas: [
    "Margem Venda",
    "Fluxo Vencimentos",
    "Notas Fiscal Venda",
    "Clientes/Títulos",
    "Fornecedor/Títulos",
    "Pedidos Venda",
    "Comissão Venda",
    "Comissão <Teste>",
    "Prêmio Metas Venda Prod",
    "Meta Venda por Vendedor",
    "Log Produtos",
  ],
};

function ErpPage() {
  const [section, setSection] = useState<Section>("inicio");

  const options = [
    { label: "Manutenção Cadastros", icon: Settings2, section: "cadastros" },
    { label: "Relatórios", icon: FileText, section: "relatorios" },
    { label: "Consultas", icon: Search, section: "consultas" },
    { label: "Operações Especiais", icon: ClipboardList, section: "operacoes" },
  ] as const;
  const currentOption = options.find((option) => option.section === section);

  function menuButton(label: string, icon: typeof Database, onClick: () => void) {
    const Icon = icon;
    return (
      <button
        key={label}
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="flex-1 font-medium">{label}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ERP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Migração gradual do sistema da DuKamp desenvolvido em Clipper.
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {section === "inicio" ? "Módulos" : section === "compras" ? "Compras" : currentOption?.label}
          </h2>
          {section !== "inicio" && (
            <p className="text-sm text-muted-foreground">ERP / Compras{section !== "compras" ? ` / ${currentOption?.label}` : ""}</p>
          )}
        </div>

        {section === "inicio" && menuButton("Compras", ShoppingCart, () => setSection("compras"))}

        {section === "compras" && (
          <>
            {options.map((option) => menuButton(option.label, option.icon, () => setSection(option.section)))}
            {menuButton("Voltar", ArrowLeft, () => setSection("inicio"))}
          </>
        )}

        {section !== "inicio" && section !== "compras" && (
          <>
            {section === "operacoes" ? (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Funcionalidades em preparação.
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Estas opções serão implementadas gradualmente.</p>
                <ol className="overflow-hidden rounded-lg border bg-card divide-y">
                  {purchaseEntries[section].map((entry, index) => (
                    <li key={entry} className="flex items-center gap-4 px-4 py-3 text-sm">
                      <span className="w-6 shrink-0 font-mono text-muted-foreground">
                        {index === 9 ? "0" : index === 10 ? "A" : index + 1}.
                      </span>
                      <span className="flex-1">{entry}</span>
                      <span className="text-xs text-muted-foreground">Em breve</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {menuButton("Voltar", ArrowLeft, () => setSection("compras"))}
          </>
        )}
      </div>
    </div>
  );
}
