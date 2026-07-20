import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    meta: [
      { title: "Sobre nós — Dukamp Saúde Animal" },
      {
        name: "description",
        content:
          "Fundada em 1998, a Dukamp Saúde Animal industrializa suplementos minerais, rações, núcleos e aditivos para a pecuária brasileira.",
      },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <SiteLayout>
      <article className="max-w-3xl space-y-10">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Sobre nós</p>
          <h1 className="text-3xl font-bold mt-1">A Dukamp</h1>
        </header>

        <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
          <p>
            Fundada em 1998, a Dukamp Saúde Animal industrializa suplementos minerais, rações,
            núcleos e aditivos, sempre desenvolvendo fórmulas inovadoras com alta tecnologia, que
            atendem as necessitades de mercado da pecuária brasileira, em todo o território
            nacional. Com um trabalho sério e comprometido com a qualidade, Dukamp sempre utiliza
            os melhores ingredientes na criação de suplementos para os animais, dando-lhes uma
            nutrição de ponta, garantindo maior desempenho nutricional e alta performance.
          </p>
          <p>
            Sua indústria é localizada no interior paulista e a Dukamp tem duas lojas: uma loja
            fábrica em Monte Aprazível e outra filial em São José do Rio Preto, onde, além de
            comercializar os produtos que fabrica, ambém trabalha com insumos, sementes de capim e
            milho, adubos, medicamentos, vacinas, ferragens, linha de arames e telas e também é
            distribuidora das grandes empresas do setor agropecuário.
          </p>
          <p>
            A Dukamp sempre preza por ter uma equipe enxuta e assim poder ter preços com custos
            baixos, atendendo ás necessidades dos produtores rurais. A Dukamp Saúde Animal é uma
            empresa parceira do produtor rural, atuando com uma equipe de técnicos para assistir a
            todos os setores da agropecuária.
          </p>
          <p className="font-medium text-foreground">
            Dukamp Saúde Animal, alimentando a pecuária do Brasil.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Nosso E-commerce</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            A Dukamp Saúde Animal tem o orgulho de alimentar a pecuária do Brasil desde 1998.
            Agora, estamos ainda mais próximos do produtor rural com nossa loja online, trazendo
            qualidade, facilidade e os melhores preços do Brasil diretamente para você.
          </p>
          <ul className="space-y-3 text-sm leading-relaxed">
            <li>
              <span className="font-semibold">🚜 Qualidade:</span> Produtos de nutrição animal
              desenvolvidos com o mais alto padrão, garantindo a saúde e produtividade do seu
              rebanho.
            </li>
            <li>
              <span className="font-semibold">🛒 Facilidade:</span> Compra rápida e prática, com
              entrega diretamente na sua propriedade.
            </li>
            <li>
              <span className="font-semibold">💰 Melhores Preços:</span> Ofertas imbatíveis para
              que você possa investir no seu rebanho sem comprometer o orçamento.
            </li>
          </ul>
        </section>
      </article>
    </SiteLayout>
  );
}
