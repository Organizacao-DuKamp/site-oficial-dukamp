import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, UserCircle, ShieldAlert } from "lucide-react";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/contas/")({
  component: ContasPage,
});

function AccessDenied() {
  return (
    <div className="max-w-md mx-auto mt-12 text-center space-y-2">
      <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground" />
      <h1 className="text-xl font-bold">Acesso restrito</h1>
      <p className="text-sm text-muted-foreground">Apenas o Administrador Mestre pode gerenciar contas.</p>
    </div>
  );
}

function ContasPage() {
  const { isMasterAdmin, loading } = useAuth();
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    enabled: isMasterAdmin,
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const [profilesR, rolesR] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, avatar_url, created_at, account_type" as any),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesR.error) throw profilesR.error;
      if (rolesR.error) throw rolesR.error;
      const adminSet = new Set(
        (rolesR.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      return (profilesR.data ?? [])
        .filter((p: any) => p.email !== PROTECTED_ADMIN_EMAIL)
        .map((p: any) => ({ ...p, isAdmin: adminSet.has(p.id) }));
    },
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data ?? [];
    return (data ?? []).filter(
      (u: any) =>
        (u.full_name ?? "").toLowerCase().includes(term) ||
        (u.email ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  if (loading) return null;
  if (!isMasterAdmin) return <AccessDenied />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Contas</h1>
        <p className="text-sm text-muted-foreground">Gerencie os usuários cadastrados.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por nome ou e-mail..."
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14"></TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Criada em</TableHead>
              <TableHead className="text-right w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhuma conta encontrada.</TableCell></TableRow>
            )}
            {filtered.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-full bg-muted grid place-items-center">
                      <UserCircle className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{u.full_name || <span className="text-muted-foreground italic">sem nome</span>}</TableCell>
                <TableCell className="text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.account_type === "admin" ? "default" : u.account_type === "cliente" ? "secondary" : "outline"}>
                    {u.account_type === "produtor" ? "Produtor Rural" : u.account_type === "admin" ? "Admin" : "Consumidor"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/contas/$id" params={{ id: u.id }}>
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
