import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/unidades")({
  head: () => ({
    meta: [
      { title: "Nossas Unidades — Dukamp Saúde Animal" },
      {
        name: "description",
        content:
          "Conheça as unidades da Dukamp Saúde Animal em Monte Aprazível e São José do Rio Preto - SP.",
      },
    ],
  }),
  component: UnidadesPage,
});

type Unidade = {
  nome: string;
  endereco: string;
  mapsQuery: string;
};

const UNIDADES: Unidade[] = [
  {
    nome: "Dukamp Saúde Animal LTDA",
    endereco:
      "Av. Santos Dumont, 403 - Jardim Bom Jesus, Monte Aprazível - SP, 15150-000",
    mapsQuery:
      "Dukamp Saúde Animal LTDA, Av. Santos Dumont, 403, Jardim Bom Jesus, Monte Aprazível - SP, 15150-000",
  },
  {
    nome: "Dukamp Saúde Animal",
    endereco:
      "R. Pedro Amaral, 3409 - Vila Ercilia, São José do Rio Preto - SP, 15014-000",
    mapsQuery:
      "Dukamp Saúde Animal, R. Pedro Amaral, 3409, Vila Ercilia, São José do Rio Preto - SP, 15014-000",
  },
];

function UnidadesPage() {
  return (
    <SiteLayout>
      <article className="max-w-4xl space-y-8">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Institucional</p>
          <h1 className="text-3xl font-bold mt-1">Nossas Unidades</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Visite uma das nossas unidades no interior de São Paulo.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {UNIDADES.map((u) => {
            const q = encodeURIComponent(u.mapsQuery);
            const embedSrc = `https://www.google.com/maps?q=${q}&output=embed`;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
            return (
              <div key={u.nome} className="rounded-lg border bg-card overflow-hidden flex flex-col">
                <div className="aspect-video bg-muted">
                  <iframe
                    src={embedSrc}
                    title={`Mapa - ${u.nome}`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h2 className="font-semibold text-base">{u.nome}</h2>
                    <p className="text-sm text-muted-foreground flex gap-2 mt-1">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{u.endereco}</span>
                    </p>
                  </div>
                  <div className="mt-auto">
                    <Button asChild className="w-full">
                      <a href={mapsUrl} target="_blank" rel="noreferrer">
                        Abrir no Google Maps
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </article>
    </SiteLayout>
  );
}
