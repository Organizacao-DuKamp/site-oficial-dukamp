import { createFileRoute } from "@tanstack/react-router";
import { UserCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/vendedor/minha-conta")({
  head: () => ({ meta: [{ title: "Minha conta — Painel do Vendedor" }] }),
  component: SellerAccount,
});

function SellerAccount() {
  const { user } = useAuth();
  return (
    <div className="max-w-3xl space-y-6">
      <div><h1 className="text-2xl font-bold">Minha conta</h1><p className="mt-1 text-sm text-muted-foreground">Informações da sua conta de vendedor.</p></div>
      <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserCircle className="h-5 w-5 text-primary" /> Conta</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">E-mail</p><p className="font-medium">{user?.email}</p></CardContent></Card>
    </div>
  );
}
