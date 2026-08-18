import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const NONE = "__none__";

type ErpSellerOption = {
  code: string;
  name: string;
  clients: number;
};

type LinkResponse = {
  seller?: {
    id: string;
    name: string;
    erpSellerCode: string | null;
    erpSellerName: string | null;
  };
  sellers?: ErpSellerOption[];
  ok?: boolean;
  erpSellerCode?: string | null;
  erpSellerName?: string | null;
  error?: string;
};

async function request(path: string, init?: RequestInit): Promise<LinkResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as LinkResponse;
  if (!response.ok) throw new Error(payload.error || "Não foi possível configurar o vendedor do ERP.");
  return payload;
}

export function SellerErpLinkCard({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(NONE);

  const link = useQuery({
    queryKey: ["seller-erp-link", userId],
    queryFn: () => request(`/api/admin/seller-erp-link?userId=${encodeURIComponent(userId)}`),
  });

  useEffect(() => {
    if (link.data?.seller) setSelected(link.data.seller.erpSellerCode || NONE);
  }, [link.data?.seller]);

  const save = useMutation({
    mutationFn: () =>
      request("/api/admin/seller-erp-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          erpSellerCode: selected === NONE ? null : selected,
        }),
      }),
    onSuccess: async () => {
      toast.success("Carteira comercial do vendedor atualizada.");
      await queryClient.invalidateQueries({ queryKey: ["seller-erp-link", userId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const currentCode = link.data?.seller?.erpSellerCode || NONE;
  const currentName = link.data?.seller?.erpSellerName;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vendedor do ERP</CardTitle>
        <CardDescription>
          Define qual carteira comercial esta conta enxerga no painel do vendedor e na Área Azul.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {link.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando vendedores...</p>
        ) : link.isError ? (
          <div className="space-y-2">
            <p className="text-sm text-destructive">
              {link.error instanceof Error ? link.error.message : "Não foi possível carregar os vendedores."}
            </p>
            <Button variant="outline" size="sm" onClick={() => void link.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Vínculo atual:</span>
              {currentCode === NONE ? (
                <Badge variant="secondary">Nenhum vendedor do ERP</Badge>
              ) : (
                <Badge variant="secondary">
                  {currentCode} - {currentName || "Vendedor"}
                </Badge>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Selecione o vendedor do ERP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem vínculo</SelectItem>
                  {(link.data?.sellers ?? []).map((seller) => (
                    <SelectItem key={seller.code} value={seller.code}>
                      {seller.code} - {seller.name} ({seller.clients.toLocaleString("pt-BR")} clientes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => save.mutate()}
                disabled={save.isPending || selected === currentCode}
              >
                {save.isPending ? "Salvando..." : "Salvar vínculo"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              A Área Azul usa este código para localizar clientes que estão há mais de seis meses sem comprar.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
