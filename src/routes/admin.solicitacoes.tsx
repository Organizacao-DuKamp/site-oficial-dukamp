import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Check, X, Clock, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/admin/solicitacoes")({
  component: SolicitacoesPage,
});

function SolicitacoesPage() {
  const { isAdmin, user, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const { data, isLoading } = useQuery({
    enabled: isAdmin,
    queryKey: ["account_requests", tab],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("account_requests")
        .select("*")
        .eq("status", tab)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc("approve_account_request", {
        _request_id: id,
        _reviewer: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação aprovada");
      qc.invalidateQueries({ queryKey: ["account_requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("account_requests")
        .update({ status: "rejected", reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação rejeitada");
      qc.invalidateQueries({ queryKey: ["account_requests"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loading) return null;
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-2">
        <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
        <h1 className="text-xl font-bold">Acesso restrito</h1>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Solicitações</h1>
        <p className="text-sm text-muted-foreground">Pedidos de cadastro como Produtor Rural e Empresa.</p>
      </div>

      <div className="flex gap-2">
        {(["pending","approved","rejected"] as const).map((s) => (
          <Button key={s} size="sm" variant={tab === s ? "default" : "outline"} onClick={() => setTab(s)}>
            {s === "pending" ? "Pendentes" : s === "approved" ? "Aprovadas" : "Rejeitadas"}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="hidden md:table-cell">Contato</TableHead>
              <TableHead className="hidden md:table-cell">Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Carregando...</TableCell></TableRow>}
            {!isLoading && (data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-sm text-muted-foreground">Nenhuma solicitação.</TableCell></TableRow>
            )}
            {(data ?? []).map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  <div>{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.email}</div>
                </TableCell>
                <TableCell><Badge variant="secondary">{r.requested_type === "produtor" ? "Produtor Rural" : r.requested_type === "empresa" ? "Empresa" : r.requested_type}</Badge></TableCell>
                <TableCell>{r.uf}</TableCell>
                <TableCell className="text-xs">{r.cnpj ? `CNPJ: ${r.cnpj}` : `CPF: ${r.cpf}`}</TableCell>
                <TableCell className="hidden md:table-cell text-xs">
                  <div>{r.phone}</div>
                  <div className="text-muted-foreground">{r.contact_email}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  {r.status === "pending" ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" onClick={() => approve.mutate(r.id)} disabled={approve.isPending}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => reject.mutate(r.id)} disabled={reject.isPending}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Badge variant={r.status === "approved" ? "default" : "destructive"}>
                      {r.status === "approved" ? "Aprovada" : "Rejeitada"}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {tab === "pending" && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Como funciona</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Ao aprovar, o tipo da conta do solicitante é atualizado automaticamente (Produtor Rural ou Empresa) e todos os dados cadastrais — propriedade, documento, contatos e área de cobrança — são copiados para o perfil dele.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
