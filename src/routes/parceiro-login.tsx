import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Store, ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { partnerLoginEmail } from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/partners/PartnerUi";
export const Route = createFileRoute("/parceiro-login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acesso do parceiro — Dukamp" }] }),
  component: PartnerLogin,
});
function PartnerLogin() {
  const { user, loading, signIn, signOut } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signIn(partnerLoginEmail(username), password);
      if (result.error)
        throw new Error("Usuário ou senha inválidos. Confira seus dados de acesso.");
      await nav({ to: "/parceiro" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" className="text-2xl font-bold">
          Dukamp Saúde Animal
        </Link>
        <div>
          <Store className="mb-8 h-12 w-12 opacity-80" />
          <p className="text-sm uppercase tracking-[.2em] opacity-70">Programa de parceiros</p>
          <h1 className="mt-4 max-w-lg text-5xl font-semibold leading-tight">
            Sua loja vende.
            <br />A Dukamp cuida da entrega.
          </h1>
          <p className="mt-6 max-w-md text-lg opacity-80">
            Consulte produtos, simule fretes e acompanhe cada venda em um só lugar.
          </p>
        </div>
        <p className="text-sm opacity-70">Produção, preparação e logística pela Dukamp.</p>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link to="/" className="text-sm font-bold text-primary lg:hidden">
            Dukamp Saúde Animal
          </Link>
          <div className="mb-6 mt-8 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck />
          </div>
          <h2 className="text-2xl font-bold">Acesso do parceiro</h2>
          <p className="mb-7 mt-2 text-sm text-muted-foreground">
            Use o usuário e a senha fornecidos pela Dukamp.
          </p>
          {loading ? (
            <p>Verificando sessão...</p>
          ) : user ? (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <p className="text-sm">
                Você já está conectado. Abra o painel ou entre com outra conta de parceiro.
              </p>
              <Button asChild className="w-full">
                <Link to="/parceiro">Abrir painel</Link>
              </Button>
              <Button className="w-full" variant="outline" onClick={() => signOut()}>
                Entrar com outra conta
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={submit}>
              <Field label="Usuário" required>
                <Input
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </Field>
              <Field label="Senha" required>
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button className="w-full" disabled={busy}>
                {busy ? "Entrando..." : "Entrar no painel"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground">
                Esqueceu a senha? Solicite a redefinição à equipe Dukamp.
              </p>
            </form>
          )}
          <Link
            to="/auth"
            className="mt-8 inline-block text-sm text-muted-foreground underline underline-offset-4"
          >
            Acesso administrativo e de clientes
          </Link>
        </div>
      </section>
    </main>
  );
}
