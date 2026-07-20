import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { traduzErroAuth } from "@/lib/auth-errors";
import { Wallet, History, Coins } from "lucide-react";

export const Route = createFileRoute("/minha-conta")({
  ssr: false,
  head: () => ({ meta: [{ title: "Minha conta — Dukamp" }] }),
  component: MinhaConta,
});

function MinhaConta() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth" });
  }, [loading, user, nav]);

  const { data: profile } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    if (profile) {
      setName((profile as any).full_name ?? "");
      setAvatar((profile as any).avatar_url ?? "");
    }
  }, [profile]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, avatar_url: avatar || null } as any)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confPw, setConfPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw.length < 6) return toast.error("A nova senha deve ter no mínimo 6 caracteres.");
    if (newPw !== confPw) return toast.error("As senhas não coincidem.");
    setPwBusy(true);
    try {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: user!.email!,
        password: curPw,
      });
      if (signErr) {
        toast.error("Senha atual incorreta.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success("Senha alterada");
      setCurPw(""); setNewPw(""); setConfPw("");
    } catch (e: any) {
      toast.error(traduzErroAuth(e.message));
    } finally {
      setPwBusy(false);
    }
  }

  if (loading || !user) return null;

  return (
    <SiteLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold">Minha conta</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e segurança.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informações pessoais</CardTitle>
            <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <div className="flex flex-col items-start gap-2">
                <Label>Foto de perfil</Label>
                {avatar ? null : (
                  <div className="h-24 w-24 rounded-full bg-muted grid place-items-center text-2xl font-semibold text-muted-foreground border">
                    {(name || user.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <ImageUpload value={avatar} onChange={setAvatar} folder={`avatars/${user.id}`} />
              </div>

              <div className="flex-1 w-full space-y-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" value={user.email ?? ""} readOnly disabled />
                </div>
                {profile && (
                  <p className="text-xs text-muted-foreground">
                    Conta criada em {new Date((profile as any).created_at).toLocaleDateString("pt-BR")}
                  </p>
                )}
              </div>
            </div>
            <div>
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                Salvar alterações
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alterar senha</CardTitle>
            <CardDescription>Para sua segurança, confirme a senha atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Senha atual</Label>
                <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} required />
              </div>
              <div>
                <Label>Nova senha</Label>
                <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={6} />
              </div>
              <div>
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confPw} onChange={(e) => setConfPw(e.target.value)} required minLength={6} />
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={pwBusy}>Alterar senha</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Cashback</CardTitle>
            </div>
            <CardDescription>
              Programa de recompensas — disponível em uma atualização futura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Coins className="h-4 w-4" /> Saldo atual
                </div>
                <div className="text-2xl font-bold mt-1">R$ 0,00</div>
                <div className="text-xs text-muted-foreground mt-1">Em breve</div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" /> Cashback acumulado
                </div>
                <div className="text-2xl font-bold mt-1">R$ 0,00</div>
                <div className="text-xs text-muted-foreground mt-1">Em breve</div>
              </div>
            </div>
            <div className="border rounded-lg">
              <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium border-b">
                <History className="h-4 w-4" /> Histórico de movimentações
              </div>
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                Nenhuma movimentação ainda.
              </div>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Esta funcionalidade estará disponível em breve.
            </p>
          </CardContent>
        </Card>
      </div>
    </SiteLayout>
  );
}
