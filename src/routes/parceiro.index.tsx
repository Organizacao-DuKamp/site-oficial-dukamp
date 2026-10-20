import { PartnerPixField } from "@/components/partners/PartnerPixField";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, PackageSearch, Calculator, ShoppingCart } from "lucide-react";
import { usePartnerData, PageHeading, SummaryCards } from "@/components/partners/PartnerUi";
export const Route = createFileRoute("/parceiro/")({ component: PartnerHome });
function PartnerHome() {
  const { data } = usePartnerData();
  if (!data) return null;
  const { partner, settings, summary } = data;
  return (
    <>
      <PageHeading
        title={`Olá, ${partner.nome_completo.split(" ")[0]}`}
        description={settings.welcome_message}
      />
      <SummaryCards summaries={[summary]} />
      <div className="mb-6"><PartnerPixField /></div>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {[
          {
            to: "/parceiro/produtos",
            title: "Consultar produtos",
            text: "Fotos, preços e estoque atualizados.",
            icon: PackageSearch,
          },
          {
            to: "/parceiro/simular",
            title: "Simular uma compra",
            text: "Confira produtos, frete e o valor da compra.",
            icon: Calculator,
          },
          {
            to: "/parceiro/registrar",
            title: "Registrar venda",
            text: "Envie o pedido sem pagamento para confirmação da Dukamp.",
            icon: ShoppingCart,
          },
        ].map((c) => (
          <Link
            to={c.to}
            key={c.to}
            className="rounded-xl border bg-card p-6 transition hover:border-primary/50 hover:shadow-sm"
          >
            <c.icon className="mb-5 h-6 w-6 text-primary" />
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.text}</p>
            <ArrowRight className="mt-5 h-4 w-4 text-primary" />
          </Link>
        ))}
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 md:col-span-2">
          <h2 className="font-semibold">Condições da parceria</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {settings.partnership_terms}
          </p>
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-semibold">Suporte Dukamp</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Dúvidas sobre produtos, pedidos ou entrega? Conte com a nossa equipe.
          </p>
          {settings.support_phone && (
            <a
              className="mt-3 block text-sm text-primary underline"
              href={`tel:${settings.support_phone.replace(/[^+\d]/g, "")}`}
            >
              {settings.support_phone}
            </a>
          )}
          {settings.support_email && (
            <a
              className="mt-2 block break-all text-sm text-primary underline"
              href={`mailto:${settings.support_email}`}
            >
              {settings.support_email}
            </a>
          )}
          {!settings.support_phone && !settings.support_email && (
            <p className="mt-3 text-xs text-muted-foreground">
              Use o atendimento do site para falar com a Dukamp.
            </p>
          )}
        </section>
      </div>
    </>
  );
}
