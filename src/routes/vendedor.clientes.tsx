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

export const Route = createFileRoute("/vendedor/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Painel do Vendedor" }] }),
  component: SellerClientsPage,
});

function escapePostgrestSearch(value: string) {
  return value.replace(/[,%()]/g, " ").trim();
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
    queryKey: ["seller-clients", user?.id, debouncedSearch, page],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      // The seller is resolved from the authenticated user, never from a URL id.
      const { data: seller, error: sellerError } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (sellerError) throw sellerError;
      if (!seller) return { associationMissing: true as const, clients: [], count: 0 };

      const from = (page - 1) * PAGE_SIZE;
      let request = supabase
        .from("profiles")
        .select("id,full_name,contact_email,email,phone,municipio_propriedade,uf", {
          count: "exact",
        })
        .eq("seller_id", seller.id)
        .order("full_name", { ascending: true, nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1);

      const term = escapePostgrestSearch(debouncedSearch);
      if (term) {
        request = request.or(
          `full_name.ilike.%${term}%,contact_email.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
        );
      }

      const { data, count, error } = await request;
      if (error) throw error;
      return {
        associationMissing: false as const,
        clients: (data ?? []) as SellerClient[],
        count: count ?? 0,
      };
    },
  });

  const pageCount = Math.max(1, Math.ceil((query.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Consulte somente os clientes associados à sua carteira.
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
            <span>Tente novamente. Se o problema continuar, fale com um administrador.</span>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      ) : query.data.associationMissing ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conta sem associação de vendedor</AlertTitle>
          <AlertDescription>
            Peça a um administrador para vincular sua conta ao cadastro da equipe de vendas.
          </AlertDescription>
        </Alert>
      ) : (
        <SellerClientList
          clients={query.data.clients}
          search={search}
          onSearchChange={setSearch}
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
