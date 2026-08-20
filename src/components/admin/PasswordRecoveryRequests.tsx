import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, KeyRound, X } from "lucide-react";
import { toast } from "sonner";

function formatCpf(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return String(value ?? "") || "Não registrado";
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

function formatPhone(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "Não registrado";
  if (digits.length === 11) return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  if (digits.length === 10) return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  return digits;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const text = String(value);
  const parts = text.slice(0, 10).split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return text;
}

function statusLabel(status: string) {
  if (status === "pending") return "Pendente";
  if (status === "approved") return "Aprovada";
  if (status === "rejected") return "Rejeitada";
  if (status === "used") return "Utilizada";
  if (status === "expired") return "Expirada";
  return status;
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

export function PasswordRecoveryRequests() {
  const qc = useQueryClient();
  const requests = useQuery({
    queryKey: ["password-recovery-requests"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("password_recovery_requests")
        .select("id,user_id,email,account_name,submitted_cpf,submitted_birth_date,submitted_phone,account_cpf,account_phone,status,reviewed_by,reviewed_at,approved_expires_at,used_at,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "approve" | "reject" }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sessão administrativa expirada.");

      const response = await fetch("/api/admin/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, decision }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Não foi possível analisar a solicitação.");
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success(variables.decision === "approve" ? "Recuperação aprovada por 24 horas." : "Solicitação rejeitada.");
      qc.invalidateQueries({ queryKey: ["password-recovery-requests"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pending = (requests.data ?? []).filter((item: any) => item.status === "pending").length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5" /> Recuperação de senha</CardTitle>
            <CardDescription>Pedidos feitos pelo login. Data de nascimento e telefone são informações declaradas e não bloqueiam a aprovação.</CardDescription>
          </div>
          {pending > 0 && <Badge>{pending} pendente{pending === 1 ? "" : "s"}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>CPF informado</TableHead>
                <TableHead>Nascimento informado</TableHead>
                <TableHead>Telefone informado</TableHead>
                <TableHead>Dados cadastrados</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.isLoading && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>}
              {!requests.isLoading && (requests.data ?? []).length === 0 && <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">Nenhuma solicitação de recuperação.</TableCell></TableRow>}
              {(requests.data ?? []).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell><Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge></TableCell>
                  <TableCell>
                    <div className="font-medium">{item.account_name || "Conta sem nome"}</div>
                    <div className="text-xs text-muted-foreground">{item.email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{formatCpf(item.submitted_cpf)}</TableCell>
                  <TableCell className="text-sm">{formatDate(item.submitted_birth_date)}</TableCell>
                  <TableCell className="text-sm">{formatPhone(item.submitted_phone)}</TableCell>
                  <TableCell className="text-xs">
                    <div>CPF: {item.account_cpf ? formatCpf(item.account_cpf) : "Não registrado"}</div>
                    <div>Telefone: {item.account_phone ? formatPhone(item.account_phone) : "Não registrado"}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div>{new Date(item.created_at).toLocaleString("pt-BR")}</div>
                    {item.status === "approved" && item.approved_expires_at && <div>Expira: {new Date(item.approved_expires_at).toLocaleString("pt-BR")}</div>}
                    {item.status === "used" && item.used_at && <div>Utilizada: {new Date(item.used_at).toLocaleString("pt-BR")}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => review.mutate({ id: item.id, decision: "approve" })} disabled={review.isPending} title="Aprovar recuperação"><Check className="h-4 w-4" /></Button>
                        <Button size="sm" variant="destructive" onClick={() => review.mutate({ id: item.id, decision: "reject" })} disabled={review.isPending} title="Rejeitar recuperação"><X className="h-4 w-4" /></Button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">{item.reviewed_at ? `Analisada em ${new Date(item.reviewed_at).toLocaleDateString("pt-BR")}` : statusLabel(item.status)}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
