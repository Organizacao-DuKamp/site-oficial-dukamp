import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createSellerQuote } from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type ClientOption = {
  id: string;
  full_name: string | null;
  email: string | null;
  contact_email: string | null;
};

async function loadClients(): Promise<ClientOption[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada. Entre novamente.");
  const response = await fetch("/api/seller/clients?page=1&pageSize=50", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    clients?: ClientOption[];
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error || "Não foi possível carregar os clientes.");
  return payload.clients ?? [];
}

export const Route = createFileRoute("/vendedor/orcamentos/novo")({ component: NewQuote });

function NewQuote() {
  const nav = useNavigate();
  const [client, setClient] = useState("");
  const [notes, setNotes] = useState("");
  const [valid, setValid] = useState(() => {
    const date = new Date(Date.now() + 7 * 86400000);
    return date.toISOString().slice(0, 10);
  });

  const clients = useQuery({ queryKey: ["seller-clients", "quote-options"], queryFn: loadClients });
  const create = useMutation({
    mutationFn: () =>
      createSellerQuote(client, notes, new Date(`${valid}T23:59:59`).toISOString()),
    onSuccess: (quote) =>
      nav({ to: "/vendedor/orcamentos/$quoteId", params: { quoteId: quote.id } }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader><CardTitle>Novo orçamento</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="client">Cliente vinculado</Label>
          <select
            id="client"
            value={client}
            onChange={(event) => setClient(event.target.value)}
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            disabled={clients.isLoading}
          >
            <option value="">{clients.isLoading ? "Carregando..." : "Selecione…"}</option>
            {clients.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.full_name || item.contact_email || item.email || "Cliente"}
              </option>
            ))}
          </select>
          {clients.isError && (
            <p className="text-sm text-destructive">
              {clients.error instanceof Error ? clients.error.message : "Não foi possível carregar os clientes."}
            </p>
          )}
          {!clients.isLoading && !clients.isError && clients.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente está vinculado à sua conta.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="valid">Validade</Label>
          <Input
            id="valid"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={valid}
            onChange={(event) => setValid(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>
        <Button disabled={!client || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Criando..." : "Criar e adicionar produtos"}
        </Button>
      </CardContent>
    </Card>
  );
}
