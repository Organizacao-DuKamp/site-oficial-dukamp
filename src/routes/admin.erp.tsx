import { createFileRoute } from "@tanstack/react-router";
import { Database } from "lucide-react";

export const Route = createFileRoute("/admin/erp")({
  component: ErpPage,
});

function ErpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">ERP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Área para a migração gradual do sistema da DuKamp desenvolvido em Clipper.
        </p>
      </div>

      <div className="flex items-start gap-4 rounded-lg border bg-card p-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Database className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-semibold">Área em preparação</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            As funcionalidades do sistema atual serão adicionadas aqui, uma por vez.
          </p>
        </div>
      </div>
    </div>
  );
}
