import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/seller-quotes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/vendedor/orcamentos/novo")({ component: NewQuote });
function NewQuote() {
  const nav = useNavigate(); const [client, setClient] = useState(""); const [notes, setNotes] = useState("");
  const [valid, setValid] = useState(() => { const d = new Date(Date.now() + 7 * 86400000); return d.toISOString().slice(0, 10); });
  const clients = useQuery({ queryKey: ["seller-clients"], queryFn: async () => { const { data, error } = await (supabase as any).rpc("list_my_seller_clients"); if (error) throw error; return data as { id: string; full_name: string; email: string }[]; } });
  const create = useMutation({ mutationFn: () => rpc("create_seller_quote", { _client_id: client, _notes: notes, _valid_until: new Date(`${valid}T23:59:59`).toISOString() }), onSuccess: (id) => nav({ to: "/vendedor/orcamentos/$quoteId", params: { quoteId: id as string } }), onError: (e: Error) => toast.error(e.message) });
  return <Card className="mx-auto max-w-2xl"><CardHeader><CardTitle>Novo orçamento</CardTitle></CardHeader><CardContent className="space-y-4">
    <div className="space-y-2"><Label htmlFor="client">Cliente vinculado</Label><select id="client" value={client} onChange={(e) => setClient(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">Selecione…</option>{clients.data?.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}</select></div>
    <div className="space-y-2"><Label htmlFor="valid">Validade</Label><Input id="valid" type="date" min={new Date().toISOString().slice(0, 10)} value={valid} onChange={(e) => setValid(e.target.value)} /></div>
    <div className="space-y-2"><Label htmlFor="notes">Observações</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
    <Button disabled={!client || create.isPending} onClick={() => create.mutate()}>Criar e adicionar produtos</Button>
  </CardContent></Card>;
}
