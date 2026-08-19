import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { SellerClientList, type SellerClient } from "@/components/sellers/SellerClientList";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 10;

type SellerClientsResponse = {
  associationMissing?: boolean;
  sellerCodeMissing?: boolean;
  seller?: {
    id: string;
    name: string;
    code?: string | null;
  };
  clients?: SellerClient[];
  count?: number;
  error?: string;
};

export const Route = createFileRoute("/vendedor/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Painel do Vendedor" }] }),
  component: SellerClientsPage,
});

async function loadSellerClients(search: string, page: number): Promise<SellerClientsResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const params = new URLSearchParams({
    source: "portfolio",
    search,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  const response = await fetch(`/api/seller/clients?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as SellerClientsResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível consultar os clientes.");
  return payload;
}

function SellerClientsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => setPage(1), [debouncedSearch]);

  const query = useQuery({
    queryKey: ["seller-portfolio-clients", user?.id, debouncedSearch, page],
    enabled: Boolean(user?.id),
    queryFn: () => loadSellerClients(debouncedSearch, page),
  });

  const count = query.data?.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.data?.seller?.code
            ? `Carteira sincronizada pelo código de vendedor ${query.data.seller.code}.`
            : "Sua carteira de clientes é sincronizada pelo código de vendedor cadastrado pelo administrador."}
        </p>
      </div>

      {query.isPending ? (
        <div className="flex min-h-48 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando clientes...
        </div>
      ) : query.isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Não foi possível consultar os clientes</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            <span>{query.error instanceof Error ? query.error.message : "Tente novamente."}</span>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : query.data?.sellerCodeMissing ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Código do vendedor não configurado</AlertTitle>
          <AlertDescription>
            Peça ao Administrador Mestre para abrir esta conta em Administração &gt; Contas e
            cadastrar o código de vendedor correspondente ao ERP.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{count.toLocaleString("pt-BR")}</span>{" "}
            cliente{count === 1 ? "" : "s"} vinculado{count === 1 ? "" : "s"} ao código{" "}
            <span className="font-medium text-foreground">{query.data?.seller?.code || "—"}</span>.
          </div>
          <SellerClientList
            clients={query.data?.clients ?? []}
            search={search}
            onSearchChange={setSearch}
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            showActions={false}
          />
        </>
      )}
    </div>
  );
}
