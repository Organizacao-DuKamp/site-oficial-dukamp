import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, PackagePlus, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type MissingMerchandise = {
  code: number;
  description: string;
  merchandise: string;
  updated_at: string;
};

type Draft = {
  code: string;
  description: string;
  merchandise: string;
};

const emptyDraft: Draft = { code: "", description: "", merchandise: "" };
// ERP tables are maintained by migrations and are not yet in the generated Supabase types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function loadEntries(): Promise<MissingMerchandise[]> {
  const { data, error } = await db
    .from("erp_missing_merchandise")
    .select("code,description,merchandise,updated_at")
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MissingMerchandise[];
}

export function ErpMissingMerchandiseMaintenance() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<number | null>(98);
  const [mode, setMode] = useState<"view" | "edit" | "new">("view");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const entries = useQuery({
    queryKey: ["erp-missing-merchandise"],
    queryFn: loadEntries,
  });
  const selected = entries.data?.find((entry) => entry.code === selectedCode) ?? null;
  const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR");
  const visible =
    entries.data?.filter(
      (entry) =>
        !normalizedSearch ||
        String(entry.code).includes(normalizedSearch) ||
        entry.description.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
    ) ?? [];

  useEffect(() => {
    if (
      entries.data?.length &&
      !entries.data.some((entry) => entry.code === selectedCode) &&
      mode === "view"
    ) {
      setSelectedCode(entries.data[0].code);
    }
  }, [entries.data, mode, selectedCode]);

  const save = useMutation({
    mutationFn: async (values: Draft) => {
      const code = Number(values.code);
      const description = values.description.trim();
      if (!Number.isInteger(code) || code < 0 || code > 99) {
        throw new Error("Informe um código inteiro de 0 a 99.");
      }
      if (!description || description.length > 40) {
        throw new Error("A descrição deve ter de 1 a 40 caracteres.");
      }
      const record = { code, description, merchandise: values.merchandise };
      const operation =
        mode === "new"
          ? db.from("erp_missing_merchandise").insert(record)
          : db
              .from("erp_missing_merchandise")
              .update({
                description: record.description,
                merchandise: record.merchandise,
              })
              .eq("code", code);
      const { data, error } = await operation.select("code").single();
      if (error) throw error;
      return Number(data.code);
    },
    onSuccess: async (code) => {
      toast.success(mode === "new" ? "Código cadastrado." : "Mercadorias atualizadas.");
      await queryClient.invalidateQueries({ queryKey: ["erp-missing-merchandise"] });
      setSelectedCode(code);
      setMode("view");
      setSearch("");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  function selectEntry(code: number) {
    setSelectedCode(code);
    setMode("view");
  }

  function editEntry(entry: MissingMerchandise) {
    setDraft({
      code: String(entry.code),
      description: entry.description,
      merchandise: entry.merchandise,
    });
    setSelectedCode(entry.code);
    setMode("edit");
  }

  function startNew() {
    setDraft(emptyDraft);
    setMode("new");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Falta/novas mercadorias</h2>
          <p className="text-sm text-muted-foreground">
            Consulte os códigos do cadastro original e registre as mercadorias em cada lista.
          </p>
        </div>
        <Button size="sm" onClick={startNew}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Novo código
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
        <aside className="space-y-3">
          <label htmlFor="erp-missing-search" className="text-sm font-medium">
            Buscar por código ou descrição
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="erp-missing-search"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ex.: 98 ou faltantes"
            />
          </div>
          {entries.isPending ? (
            <p className="text-sm text-muted-foreground">Carregando cadastros...</p>
          ) : entries.isError ? (
            <p role="alert" className="text-sm text-destructive">
              Erro ao consultar:{" "}
              {entries.error instanceof Error ? entries.error.message : "tente novamente"}
            </p>
          ) : visible.length ? (
            <ul className="space-y-2">
              {visible.map((entry) => (
                <li key={entry.code}>
                  <button
                    type="button"
                    onClick={() => selectEntry(entry.code)}
                    aria-current={
                      selectedCode === entry.code && mode === "view" ? "true" : undefined
                    }
                    className={
                      "w-full rounded-lg border px-3 py-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 " +
                      (selectedCode === entry.code && mode === "view"
                        ? "border-primary bg-primary/5"
                        : "bg-card")
                    }
                  >
                    <span className="block text-xs font-medium text-muted-foreground">
                      Código {String(entry.code).padStart(2, "0")}
                    </span>
                    <span className="mt-1 block font-semibold">{entry.description}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {entry.merchandise.trim()
                        ? "Com mercadorias registradas"
                        : "Sem mercadorias registradas"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum código encontrado.</p>
          )}
        </aside>

        <section
          className="min-w-0 rounded-xl border bg-card p-4 sm:p-5"
          aria-label="Detalhes do cadastro"
        >
          {mode === "new" || mode === "edit" ? (
            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                save.mutate(draft);
              }}
            >
              <div>
                <h3 className="text-lg font-semibold">
                  {mode === "new" ? "Novo código" : "Editar código " + draft.code}
                </h3>
                <p className="text-sm text-muted-foreground">
                  O campo Mercadorias é um texto livre, como no cadastro do COMPRAS.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                <label className="space-y-1.5 text-sm font-medium">
                  Código *
                  <Input
                    required
                    type="number"
                    min={0}
                    max={99}
                    step={1}
                    readOnly={mode === "edit"}
                    value={draft.code}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, code: event.target.value }))
                    }
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Descrição *
                  <Input
                    required
                    maxLength={40}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((previous) => ({ ...previous, description: event.target.value }))
                    }
                  />
                </label>
              </div>
              <label className="block space-y-1.5 text-sm font-medium">
                Mercadorias
                <Textarea
                  className="min-h-64 font-mono"
                  value={draft.merchandise}
                  onChange={(event) =>
                    setDraft((previous) => ({ ...previous, merchandise: event.target.value }))
                  }
                  placeholder="Digite as mercadorias, uma por linha ou no formato que preferir."
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending}>
                  {save.isPending
                    ? "Salvando..."
                    : mode === "new"
                      ? "Cadastrar código"
                      : "Salvar alterações"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode("view")}
                  disabled={save.isPending}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : selected ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Código {String(selected.code).padStart(2, "0")}
                  </p>
                  <h3 className="text-lg font-semibold">{selected.description}</h3>
                </div>
                <Button size="sm" variant="outline" onClick={() => editEntry(selected)}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                  Editar
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  Mercadorias
                </div>
                {selected.merchandise.trim() ? (
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                    {selected.merchandise}
                  </pre>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma mercadoria registrada neste código.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <PackagePlus className="h-8 w-8" aria-hidden="true" />
              <p className="text-sm">Selecione um código para consultar as mercadorias.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

