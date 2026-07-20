import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AccountType } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, UserCircle, ShieldCheck, ShieldOff, KeyRound, Lock } from "lucide-react";
import { toast } from "sonner";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/contas/$id")({
  component: ContaDetalhe,
});

function ContaDetalhe() {
  const { id } = Route.useParams();
  const { user: me, isMasterAdmin, loading: authLoading } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data, isLoading } = useQuery({
    enabled: isMasterAdmin,
    queryKey: ["account", id],
    queryFn: async () => {
      const [profileR, rolesR] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
        supabase.from("user_roles").select("*").eq("user_id", id),
      ]);
      if (profileR.error) throw profileR.error;
      if (rolesR.error) throw rolesR.error;
      return {
        profile: profileR.data,
        isAdmin: (rolesR.data ?? []).some((r) => r.role === "admin"),
        adminRow: (rolesR.data ?? []).find((r) => r.role === "admin"),
      };
    },
  });

  // Conta protegida: nunca exibir
  useEffect(() => {
    if (data?.profile && (data.profile as any).email === PROTECTED_ADMIN_EMAIL) {
      toast.error("Conta indisponível.");
      nav({ to: "/admin/contas" });
    }
  }, [data, nav]);

  const promote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promovido a administrador");
      qc.invalidateQueries({ queryKey: ["account", id] });
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const demote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Privilégio removido");
      qc.invalidateQueries({ queryKey: ["account", id] });
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [pendingType, setPendingType] = useState<AccountType | "">("");
  const currentType: AccountType = ((data?.profile as any)?.account_type ?? "cliente") as AccountType;

  const changeType = useMutation({
    mutationFn: async (newType: AccountType) => {
      // 'admin' type is bookkeeping: also manage user_roles
      const { error } = await (supabase as any).from("profiles").update({ account_type: newType }).eq("id", id);
      if (error) throw error;
      if (newType === "admin" && !data?.isAdmin) {
        const { error: e2 } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" } as any);
        if (e2) throw e2;
      }
      if (newType !== "admin" && data?.isAdmin) {
        const { error: e3 } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
        if (e3) throw e3;
      }
    },
    onSuccess: () => {
      toast.success("Tipo de conta atualizado");
      setPendingType("");
      qc.invalidateQueries({ queryKey: ["account", id] });
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (authLoading) return null;
  if (!isMasterAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-2">
        <h1 className="text-xl font-bold">Acesso restrito</h1>
        <p className="text-sm text-muted-foreground">Apenas o Administrador Mestre pode gerenciar contas.</p>
      </div>
    );
  }
  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando...</div>;
  if (!data?.profile) {
    return (
      <div>
        <Button asChild variant="ghost" size="sm"><Link to="/admin/contas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link></Button>
        <p className="mt-4 text-sm text-muted-foreground">Conta não encontrada.</p>
      </div>
    );
  }

  const p: any = data.profile;
  if (p.email === PROTECTED_ADMIN_EMAIL) return null;

  const canDemote = me?.email === PROTECTED_ADMIN_EMAIL && data.isAdmin;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/contas"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover border" />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted grid place-items-center border">
                <UserCircle className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="truncate">{p.full_name || "Sem nome"}</CardTitle>
              <CardDescription className="truncate">{p.email}</CardDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {data.isAdmin ? <Badge>Administrador</Badge> : <Badge variant="secondary">Usuário</Badge>}
                {p.created_at && (
                  <span className="text-xs text-muted-foreground">
                    Criada em {new Date(p.created_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tipo de conta</CardTitle>
          <CardDescription>Atual: <span className="font-medium">{currentType === "cliente" ? "Consumidor" : currentType === "produtor" ? "Produtor Rural" : "Admin"}</span></CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <Select value={pendingType || currentType} onValueChange={(v) => setPendingType(v as AccountType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cliente">Consumidor</SelectItem>
                
                <SelectItem value="produtor">Produtor Rural</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => pendingType && changeType.mutate(pendingType)}
            disabled={!pendingType || pendingType === currentType || changeType.isPending}
          >
            Salvar tipo
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Privilégio de Administrador</CardTitle>
          <CardDescription>Controle direto do papel "admin" (sincronizado ao tipo).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {!data.isAdmin && (
            <Button variant="outline" onClick={() => promote.mutate()} disabled={promote.isPending}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Definir como Administrador
            </Button>
          )}
          {data.isAdmin && !canDemote && (
            <Badge className="text-sm py-2 px-3"><ShieldCheck className="h-4 w-4 mr-1" /> Administrador</Badge>
          )}
          {canDemote && (
            <>
              <Badge className="text-sm py-2 px-3"><ShieldCheck className="h-4 w-4 mr-1" /> Administrador</Badge>
              <Button
                variant="destructive"
                onClick={() => {
                  if (confirm("Remover privilégios de administrador desta conta?")) demote.mutate();
                }}
                disabled={demote.isPending}
              >
                <ShieldOff className="h-4 w-4 mr-2" /> Remover Administrador
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Senha protegida</span>
            <span className="text-muted-foreground">— jamais exibida.</span>
          </div>
          <Button variant="outline" disabled title="Em breve">
            <KeyRound className="h-4 w-4 mr-2" /> Redefinir senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
