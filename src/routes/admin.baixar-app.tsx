import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Smartphone, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminInstall } from "@/lib/admin-install";

export const Route = createFileRoute("/admin/baixar-app")({
  component: InstallAdminApp,
  head: () => ({ meta: [{ title: "Baixar aplicativo | DuKamp Admin" }] }),
});

function InstallAdminApp() {
  const { canPrompt, installed, install } = useAdminInstall();
  const [device, setDevice] = useState<"ios" | "android" | "desktop">("desktop");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const agent = navigator.userAgent;
    setDevice(
      /iPhone|iPad|iPod/i.test(agent) ? "ios" : /Android/i.test(agent) ? "android" : "desktop",
    );
  }, []);

  async function requestInstall() {
    setBusy(true);
    try {
      await install();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <img
            src="/admin-icon-192.png"
            alt="Ícone do DuKamp Admin"
            width={72}
            height={72}
            className="rounded-2xl"
          />
          <div>
            <h1 className="text-2xl font-bold">DuKamp Admin no celular</h1>
            <p className="text-sm text-muted-foreground">
              Abra o painel diretamente pela tela inicial do aparelho.
            </p>
          </div>
        </div>
        <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
          O atalho abre o painel em uma janela própria. Ele usa sua conta administrativa atual e
          precisa de internet para carregar dados e salvar alterações.
        </p>
        {installed ? (
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-800 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5" /> O aplicativo está instalado. Abra-o pela tela inicial do aparelho.
          </div>
        ) : canPrompt ? (
          <Button className="mt-6 w-full sm:w-auto" disabled={busy} onClick={requestInstall}>
            <Download className="mr-2 h-4 w-4" />{" "}
            {busy ? "Abrindo instalação..." : "Instalar DuKamp Admin"}
          </Button>
        ) : null}
      </div>

      {!installed && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section
            className={`rounded-xl border bg-card p-5 ${device === "ios" ? "ring-2 ring-primary/30" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">iPhone ou iPad</h2>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Abra esta página no <strong>Safari</strong>.
              </li>
              <li>
                Toque em <strong>Compartilhar</strong> <Share2 className="inline h-4 w-4" />.
              </li>
              <li>
                Escolha <strong>Adicionar à Tela de Início</strong> e confirme. Se aparecer,
                mantenha <strong>Abrir como App</strong> ativado.
              </li>
            </ol>
          </section>
          <section
            className={`rounded-xl border bg-card p-5 ${device === "android" ? "ring-2 ring-primary/30" : ""}`}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Android</h2>
            </div>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>
                Abra esta página no <strong>Chrome</strong>.
              </li>
              <li>
                Toque em <strong>Instalar DuKamp Admin</strong> acima, se o botão aparecer.
              </li>
              <li>
                Se não aparecer, abra o menu <strong>⋮</strong> do Chrome e escolha{" "}
                <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
              </li>
            </ol>
          </section>
        </div>
      )}

      <div className="rounded-xl border bg-muted/30 p-5 text-sm">
        <p className="font-medium">Acesso ao painel</p>
        <p className="mt-1 text-muted-foreground">
          Depois de instalar, toque no ícone “DuKamp Admin”. Caso sua sessão tenha expirado, entre
          novamente com a conta de administrador.
        </p>
        <Link
          to="/admin"
          className="mt-3 inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          Voltar ao painel <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
