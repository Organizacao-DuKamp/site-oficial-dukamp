import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, FolderTree, Tag, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/estoque")({
  component: EstoquePainel,
});

function EstoquePainel() {
  const counts = useQuery({
    queryKey: ["admin", "estoque", "counts"],
    queryFn: async () => {
      const [p, c, cat] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("catalogs").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
      ]);
      return { products: p.count ?? 0, catalogs: c.count ?? 0, categories: cat.count ?? 0 };
    },
  });
  const latest = useQuery({
    queryKey: ["admin", "estoque", "latest-products"],
    queryFn: async () => (await supabase.from("products").select("*").order("created_at", { ascending: false }).limit(5)).data ?? [],
  });

  const cards = [
    { label: "Produtos", value: counts.data?.products, icon: Package, to: "/admin/produtos" },
    { label: "Catálogos", value: counts.data?.catalogs, icon: FolderTree, to: "/admin/catalogos" },
    { label: "Categorias", value: counts.data?.categories, icon: Tag, to: "/admin/categorias" },
    { label: "Atualizar valores", value: "→", icon: RefreshCw, to: "/admin/atualizar-valores" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Painel do Estoque</h1>
      <p className="text-sm text-muted-foreground">Visão geral do inventário e catálogos.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="rounded-lg border bg-card p-4 hover:bg-accent transition-colors">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{c.label}</div>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-3xl font-bold mt-2">{c.value ?? "..."}</div>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border bg-card">
        <div className="p-4 border-b font-semibold">Últimos produtos cadastrados</div>
        <div className="divide-y">
          {latest.data?.map((p) => (
            <Link key={p.id} to="/admin/produtos" className="flex items-center justify-between p-4 hover:bg-accent text-sm">
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.code}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
