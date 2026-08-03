import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/vendedor/")({
  head: () => ({ meta: [{ title: "Painel do Vendedor — Dukamp" }] }),
  component: SellerHome,
});

function SellerHome() {
  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Painel do Vendedor</h1><p className="mt-1 text-sm text-muted-foreground">Sua área exclusiva na DuKamp.</p></div>
      <Card><CardHeader><CardTitle className="text-lg">Bem-vindo!</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">Bem-vindo ao Painel do Vendedor. Novas ferramentas estarão disponíveis em breve.</p></CardContent></Card>
    </div>
  );
}
