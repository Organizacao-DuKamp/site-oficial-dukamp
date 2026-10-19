import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/parceiros")({
  component: () => (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Canal de parcerias
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Dukamp Saúde Animal · Venda sem estoque
          </p>
        </div>
        <a
          className="text-sm font-medium text-primary underline underline-offset-4"
          href="/parceiro-login"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir acesso do parceiro
        </a>
      </div>
      <Outlet />
    </div>
  ),
});
