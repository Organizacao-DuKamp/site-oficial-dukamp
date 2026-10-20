import { PartnerCommissionAccount } from "@/components/partners/PartnerCommissionAccount";
import { PartnerPixField } from "@/components/partners/PartnerPixField";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PackageSearch, Calculator, ShoppingCart, ClipboardList, Headphones, FileCheck2, ChevronDown, Wheat, Phone, Mail } from "lucide-react";
import { usePartnerData, SummaryCards } from "@/components/partners/PartnerUi";
export const Route = createFileRoute("/parceiro/")({ component: PartnerHome });
function PartnerHome() {
  const { data } = usePartnerData();
  if (!data) return null;
  const { partner, settings, summary } = data;
  return (
    <div className="partner-home space-y-6">
      <section className="partner-home-hero">
        <Wheat className="partner-hero-art" aria-hidden="true" />
        <div className="relative min-w-0">
          <p className="partner-eyebrow">Sua parceria, em movimento</p>
          <h1>Olá, {partner.nome_completo.split(" ")[0]}.</h1>
          <p className="partner-hero-description">{settings.welcome_message}</p>
        </div>
        <div className="partner-hero-actions">
          <Link to="/parceiro/registrar" className="partner-primary-action"><ShoppingCart size={17} />Registrar venda<ArrowRight size={16} /></Link>
          <Link to="/parceiro/vendas" className="partner-secondary-action"><ClipboardList size={17} />Acompanhar vendas</Link>
        </div>
      </section>

      <section aria-label="Resultados da parceria">
        <SummaryCards summaries={[summary]} />
      </section>

      <section>
        <div className="partner-section-heading"><h2>O que vamos fazer hoje?</h2><span>Do produto ao pedido</span></div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { to: "/parceiro/produtos", title: "Consultar produtos", text: "Veja fotos, preços e disponibilidade.", icon: PackageSearch, step: "01" },
            { to: "/parceiro/simular", title: "Simular uma compra", text: "Calcule produtos, frete e o total do pedido.", icon: Calculator, step: "02" },
            { to: "/parceiro/registrar", title: "Registrar venda", text: "Envie a compra para confirmação da DuKamp.", icon: ShoppingCart, step: "03" },
          ].map(c => (
            <Link to={c.to} key={c.to} className="partner-shortcut">
              <div className="partner-shortcut-top"><span className="partner-shortcut-icon"><c.icon size={22} /></span><span className="partner-step">{c.step}</span></div>
              <h3>{c.title}</h3><p>{c.text}</p>
              <span className="partner-shortcut-link">Acessar<ArrowRight size={15} /></span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="Financeiro da parceria">
        <div className="partner-section-heading"><h2>Seu financeiro</h2><span>Saldo, pagamentos e recebimento</span></div>
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0"><PartnerCommissionAccount /></div>
          <div className="min-w-0"><PartnerPixField /></div>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <details className="partner-terms">
          <summary><span className="partner-support-icon"><FileCheck2 size={20} /></span><span>Condições da parceria<small>Consulte as regras da sua operação</small></span><ChevronDown className="ml-auto h-4 w-4" /></summary>
          <p className="whitespace-pre-wrap">{settings.partnership_terms}</p>
        </details>
        <section className="partner-support">
          <div className="flex items-center gap-3"><span className="partner-support-icon"><Headphones size={20} /></span><h2>Conte com a DuKamp</h2></div>
          <p>Dúvidas sobre produtos, pedidos ou entrega? Fale com a nossa equipe.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {settings.support_phone && <a href={`tel:${settings.support_phone.replace(/[^+\d]/g, "")}`}><Phone size={15} />{settings.support_phone}</a>}
            {settings.support_email && <a className="break-all" href={`mailto:${settings.support_email}`}><Mail size={15} />{settings.support_email}</a>}
            {!settings.support_phone && !settings.support_email && <Link to="/contato">Falar com a DuKamp<ArrowRight size={15} /></Link>}
          </div>
        </section>
      </div>
    </div>
  );
}
