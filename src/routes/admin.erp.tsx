import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ChevronRight, ClipboardList, Database, FileText, Search, Settings2, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin/erp")({
  component: ErpPage,
});

function ErpPage() {
  type Section = "inicio" | "compras" | "cadastros" | "relatorios" | "consultas" | "operacoes";
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

        {section === "cadastros" && (
          <div className="flex items-center gap-4 rounded-lg border bg-muted/40 p-4 text-muted-foreground" aria-disabled="true">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex-1 font-medium">Tabela preço/produto</span>
            <span className="text-xs">Em breve</span>
          </div>
        )}

        {section !== "inicio" && section !== "compras" && (
          <>
            {section !== "cadastros" && (
              <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
                Funcionalidades em preparação.
              </div>
            )}
            {menuButton("Voltar", ArrowLeft, () => setSection("compras"))}
          </>
        )}
      </div>
    </div>
  );
}
