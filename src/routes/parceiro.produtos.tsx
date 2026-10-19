import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Package } from "lucide-react";
import { partnerProducts } from "@/lib/partners.functions";
import { useAuth } from "@/lib/auth";
import { formatBRL } from "@/lib/cart";
import { readProductOptions } from "@/lib/product-options";
import {
  usePartnerProducts,
  PageHeading,
  ErrorNotice,
  EmptyState,
} from "@/components/partners/PartnerUi";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const Route = createFileRoute("/parceiro/produtos")({ component: Products });
function Products() {
  const query = usePartnerProducts();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rows = (query.data || []).filter((p) =>
    `${p.name} ${p.code || ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <>
      <PageHeading
        title="Consultar produto"
        description="Catálogo ativo da Dukamp, com fotos, preços ao consumidor e disponibilidade para venda."
        action={
          <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
            Atualizar estoque
          </Button>
        }
      />
      <Input
        className="mb-6 max-w-lg"
        placeholder="Buscar por produto ou código"
        aria-label="Buscar produtos"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />
      {query.isPending ? (
        <p>Carregando catálogo...</p>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => query.refetch()} />
      ) : !rows.length ? (
        <EmptyState>Nenhum produto encontrado.</EmptyState>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.slice((page - 1) * 24, page * 24).map((p) => (
              <article
                key={p.id}
                className="flex flex-col overflow-hidden rounded-xl border bg-card"
              >
                <div className="grid h-48 place-items-center bg-white p-4">
                  {p.images?.[0] ? (
                    <img
                      alt={p.name}
                      src={p.images[0]}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs text-muted-foreground">Código {p.code || "—"}</p>
                  <h2 className="mt-2 flex-1 font-semibold">{p.name}</h2>
                  <p className="mt-4 text-xl font-bold">{formatBRL(p.price)}</p>
                  <p
                    className={`mt-1 text-xs ${p.stock > 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {p.stock > 0 ? `${p.stock} unidades disponíveis` : "Sem estoque"}
                  </p>
                  {readProductOptions(p.options).length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Possui opções de produto.</p>
                  )}
                  <Button
                    asChild
                    disabled={p.stock <= 0 || p.price <= 0}
                    variant="outline"
                    className="mt-4"
                  >
                    {p.stock > 0 && p.price > 0 ? (
                      <Link to="/parceiro/simular" search={{ produto: p.id }}>
                        Simular compra
                      </Link>
                    ) : (
                      <span>Indisponível</span>
                    )}
                  </Button>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between text-sm">
            <span>
              {rows.length} produtos · página {page} de {Math.max(1, Math.ceil(rows.length / 24))}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <Button
                variant="outline"
                disabled={page * 24 >= rows.length}
                onClick={() => setPage(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
