import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Store, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { partnerLoginEmail, partnerUsernameSchema } from "@/lib/partners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/partners/PartnerUi";
import dukampLogo from "@/assets/dukamp-logo.webp";
export const Route = createFileRoute("/parceiro-login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Acesso do parceiro — Dukamp" }] }),
  component: PartnerLogin,
});
type LoginNotice = {
  title: string;
  description: string;
  field?: "username" | "credentials";
  showOtherAccess?: boolean;
};
function PartnerLogin() {
  const { user, loading, signIn, signOut } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<LoginNotice | null>(null);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const validated = partnerUsernameSchema.safeParse(username);
    if (!validated.success) {
      const isEmail = username.includes("@");
      setError({
        title: isEmail ? "Use seu usuário de parceiro" : "Confira o nome de usuário",
        description: isEmail
          ? "Neste painel, entre com o usuário fornecido pela Dukamp, sem @ ou domínio de e-mail. Exemplo: agropet."
          : "O usuário deve ter de 3 a 50 caracteres: letras sem acento, números, ponto, traço ou sublinhado.",
        field: "username",
        showOtherAccess: isEmail,
      });
      return;
    }
    setBusy(true);
    try {
      const result = await signIn(partnerLoginEmail(validated.data), password);
      if (result.error) {
        const unavailable = /fetch|network|timeout|temporarily|rate limit|too many/i.test(
          result.error,
        );
        setError(
          unavailable
            ? {
                title: "Não foi possível conectar agora",
                description: "Aguarde um momento, confira sua conexão e tente novamente.",
              }
            : {
                title: "Não conseguimos confirmar seu acesso",
                description:
                  "Confira seu usuário e sua senha e tente novamente. Se precisar, solicite novos dados à equipe Dukamp.",
                field: "credentials",
              },
        );
        return;
      }
      await nav({ to: "/parceiro" });
    } catch {
      setError({
        title: "Não foi possível entrar agora",
        description: "Confira sua conexão e tente novamente em instantes.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex">
        <Link to="/" aria-label="DuKamp — início" className="w-fit rounded-xl bg-white p-3 shadow-sm">
          <img src={dukampLogo} alt="DuKamp Saúde Animal" width={216} height={72} className="h-16 w-auto object-contain" />
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
          <Link to="/" aria-label="DuKamp — início" className="inline-block lg:hidden">
            <img src={dukampLogo} alt="DuKamp Saúde Animal" width={180} height={60} className="h-14 w-auto object-contain" />
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
                  disabled={busy}
                  aria-invalid={error?.field === "username" || error?.field === "credentials"}
                  aria-describedby={error?.field ? "partner-login-error-message" : undefined}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                />
                <span className="text-xs font-normal text-muted-foreground">
                  Exemplo: agropet — sem @ ou endereço de e-mail.
                </span>
              </Field>
              <Field label="Senha" required>
                <Input
                  required
                  type="password"
                  autoComplete="current-password"
                  disabled={busy}
                  aria-invalid={error?.field === "credentials"}
                  aria-describedby={
                    error?.field === "credentials" ? "partner-login-error-message" : undefined
                  }
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
              </Field>
              {error && (
                <div
                  role="alert"
                  className={`flex items-start gap-3 rounded-xl border p-4 ${error.field === "username" ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100" : "border-destructive/20 bg-destructive/5 text-foreground"}`}
                >
                  <div
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${error.field === "username" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-destructive/10 text-destructive"}`}
                  >
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold leading-5">{error.title}</p>
                    <p
                      id="partner-login-error-message"
                      className="text-xs leading-relaxed opacity-85"
                    >
                      {error.description}
                    </p>
                    {error.showOtherAccess && (
                      <Link
                        to="/auth"
                        className="inline-flex items-center gap-1 pt-1 text-xs font-semibold underline underline-offset-4"
                      >
                        Acesso administrativo e de clientes
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
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
