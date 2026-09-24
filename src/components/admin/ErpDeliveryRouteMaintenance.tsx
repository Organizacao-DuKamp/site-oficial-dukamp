import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CustomerRoute = {
  id: string;
  codigo: string;
  cliente: string;
  roteiro: string | null;
  cidade: string | null;
  uf: string | null;
};
type RouteFilter = "todos" | "com-roteiro" | "sem-roteiro";

const PAGE_SIZE = 25;

async function searchCustomers(term: string, filter: RouteFilter, page: number) {
  let query = supabase.from("customers")
    .select("id,codigo,cliente,roteiro,cidade,uf", { count: "exact" })
    .order("cliente", { ascending: true })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (term) {
    if (/^[0-9]{1,6}$/.test(term)) {
      // No Clipper, o código 4111 aparece como 004111 no cadastro do site.
      query = query.eq("codigo", term.padStart(6, "0"));
    } else {
      query = query.ilike("cliente", `%${term.replace(/[\\%_]/g, "\\$&")}%`);
    }
  }
  if (filter === "com-roteiro") query = query.not("roteiro", "is", null).neq("roteiro", "");
  if (filter === "sem-roteiro") query = query.or("roteiro.is.null,roteiro.eq.");

  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as CustomerRoute[], total: count ?? 0 };
}

export function ErpDeliveryRouteMaintenance({ onBack }: { onBack: () => void }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [filter, setFilter] = useState<RouteFilter>("todos");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<CustomerRoute | null>(null);
  const [draft, setDraft] = useState("");

  const customers = useQuery({
    queryKey: ["erp-delivery-routes", term, filter, page],
    queryFn: () => searchCustomers(term, filter, page),
  });

  const save = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const roteiro = text.trim() || null;
      const { error } = await supabase.from("customers")
        .update({ roteiro }).eq("id", id).select("id").single();
      if (error) throw error;
      return { id, roteiro };
    },
    onSuccess: async ({ id, roteiro }) => {
      setSelected((current) => current?.id === id ? { ...current, roteiro } : current);
      await queryClient.invalidateQueries({ queryKey: ["erp-delivery-routes"] });
      toast.success("Roteiro de entrega salvo no cadastro do cliente.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível salvar o roteiro."),
  });

  function choose(customer: CustomerRoute) {
    setSelected(customer);
    setDraft(customer.roteiro ?? "");
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTerm(search.trim());
    setPage(0);
    setSelected(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold">Roteiro de Entrega</h3>
          <p className="text-sm text-muted-foreground">Consulte ou edite o roteiro do cadastro de clientes da DuKamp.</p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
      </div>

      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={submitSearch}>
        <label htmlFor="erp-route-search" className="sr-only">Código ou nome do cliente</label>
        <Input id="erp-route-search" className="sm:max-w-lg" value={search}
          onChange={(event) => setSearch(event.target.value)} placeholder="Código do cliente ou nome" />
        <Button type="submit"><Search className="mr-2 h-4 w-4" /> Pesquisar</Button>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar clientes pelo roteiro">
        {([
          { value: "todos", label: "Todos os clientes" },
          { value: "com-roteiro", label: "Com roteiro" },
          { value: "sem-roteiro", label: "Sem roteiro" },
        ] as const).map(({ value, label }) => (
          <Button key={value} type="button" size="sm" variant={filter === value ? "default" : "outline"}
            onClick={() => { setFilter(value); setPage(0); setSelected(null); }}>{label}</Button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap justify-between gap-2 border-b px-4 py-2 text-xs text-muted-foreground">
          <span>Clientes cadastrados</span>
          <span>{customers.data?.total.toLocaleString("pt-BR") ?? "—"} encontrado(s)</span>
        </div>
        {customers.isPending ? <p className="p-4 text-sm">Carregando clientes...</p> : customers.isError ? (
          <p role="alert" className="p-4 text-sm text-destructive">
            Erro ao consultar clientes: {customers.error instanceof Error ? customers.error.message : "tente novamente"}
          </p>
        ) : customers.data.rows.length ? (
          <ul className="max-h-80 divide-y overflow-y-auto">
            {customers.data.rows.map((customer) => (
              <li key={customer.id}>
                <button type="button" onClick={() => choose(customer)}
                  className={"flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-left text-sm hover:bg-accent " + (selected?.id === customer.id ? "bg-primary/10" : "")}>
                  <span className="font-mono text-muted-foreground">{customer.codigo}</span>
                  <span className="min-w-0 flex-1 font-medium">{customer.cliente}</span>
                  <span className="text-xs text-muted-foreground">{[customer.cidade, customer.uf].filter(Boolean).join("/")}</span>
                  <span className="text-xs">{customer.roteiro?.trim() ? "Com roteiro" : "Sem roteiro"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="p-4 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>}
        {customers.data && customers.data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-sm">
            <Button type="button" variant="outline" size="sm" disabled={page === 0}
              onClick={() => { setPage((current) => current - 1); setSelected(null); }}>Anterior</Button>
            <span>Página {page + 1} de {Math.ceil(customers.data.total / PAGE_SIZE)}</span>
            <Button type="button" variant="outline" size="sm" disabled={(page + 1) * PAGE_SIZE >= customers.data.total}
              onClick={() => { setPage((current) => current + 1); setSelected(null); }}>Próxima</Button>
          </div>
        )}
      </div>

      {selected && (
        <form className="space-y-4 rounded-lg border bg-card p-4" onSubmit={(event) => {
          event.preventDefault();
          save.mutate({ id: selected.id, text: draft });
        }}>
          <div>
            <p className="text-sm text-muted-foreground">Código do cliente: {selected.codigo}</p>
            <h4 className="text-base font-semibold">{selected.cliente}</h4>
          </div>
          <label htmlFor="erp-route-notes" className="block space-y-2 text-sm font-medium">
            Informe observações do roteiro
            <Textarea id="erp-route-notes" className="min-h-48" value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Descreva como chegar ao endereço de entrega..." />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={save.isPending || draft.trim() === (selected.roteiro ?? "")}>
              {save.isPending ? "Salvando..." : "Salvar roteiro"}
            </Button>
            <Button type="button" variant="outline" onClick={() => { setSelected(null); setDraft(""); }}>Fechar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
