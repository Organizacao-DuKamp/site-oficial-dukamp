import { Link, useNavigate } from "@tanstack/react-router";
import { useSiteSettings } from "@/lib/site-settings";
import { FOOTER_PAGES } from "@/lib/footer-pages";
import { useAuth } from "@/lib/auth";
import { useSupport } from "@/lib/support";
import fixedLogo from "@/assets/dukamp-logo.webp";

export function Footer() {
  const { data: settings } = useSiteSettings();
  const { user } = useAuth();
  const { openChat } = useSupport();
  const nav = useNavigate();
  const siteName = settings?.site_name || "Dukamp Saúde Animal";
  const tagline = settings?.tagline || "Mais de 20 anos cuidando da saúde dos animais.";
  const email = settings?.email || "contato@dukamp.com.br";

  const informacoes = FOOTER_PAGES.filter((p) => p.group === "informacoes");
  const seguranca = FOOTER_PAGES.filter((p) => p.group === "seguranca");

  function handleFaleConosco(e: React.MouseEvent) {
    e.preventDefault();
    if (!user) {
      nav({ to: "/auth" });
      return;
    }
    openChat();
  }

  return (
    <footer className="border-t bg-card mt-12">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src={fixedLogo} alt={siteName} className="h-8 w-auto max-w-[140px] object-contain" />
            <div className="font-bold">{siteName}</div>
          </div>
          <p className="text-muted-foreground">{tagline}</p>
        </div>

        <div>
          <div className="font-semibold mb-3">Institucional</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/unidades" className="hover:text-primary">Nossas Unidades</Link></li>
            <li><Link to="/sobre" className="hover:text-primary">Sobre Nós</Link></li>
            <li>
              <a href="/contato" onClick={handleFaleConosco} className="hover:text-primary cursor-pointer">
                Fale Conosco
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-3">Informações</div>
          <ul className="space-y-2 text-muted-foreground">
            {informacoes.map((p) => (
              <li key={p.slug}>
                <Link to="/paginas/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link>
              </li>
            ))}
          </ul>
          <div className="font-semibold mt-6 mb-3">Segurança</div>
          <ul className="space-y-2 text-muted-foreground">
            {seguranca.map((p) => (
              <li key={p.slug}>
                <Link to="/paginas/$slug" params={{ slug: p.slug }} className="hover:text-primary">{p.title}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-semibold mb-3">Contato</div>
          <ul className="space-y-4 text-muted-foreground">
            <li>{email}</li>
            <li>
              <div className="font-semibold text-foreground">Matriz</div>
              <div className="text-xs text-muted-foreground/80 mb-1">
                Indústria · Administrativa · Logística
              </div>
              <div>(17) 3275-3106</div>
              <div>Av. Santos Dumont, 403 — Monte Aprazível/SP</div>
            </li>
            <li>
              <div className="font-semibold text-foreground">
                Filial — São José do Rio Preto
              </div>
              <div>(17) 2136-1111</div>
              <div>
                R. Pedro Amaral, 3409 — Vila Ercília, São José do Rio Preto/SP,
                15014-000
              </div>
            </li>
          </ul>
        </div>

      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteName}. Todos os direitos reservados.
      </div>
    </footer>
  );
}
