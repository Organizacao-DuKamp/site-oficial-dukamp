import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Boxes,
  Building2,
  Database,
  Eye,
  FileArchive,
  Search,
  ShieldCheck,
  TableProperties,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/dukamp")({
  component: DukampLegacyArchive,
});

type LegacyColumn = {
  name: string;
  source: string;
  type: string;
  searchable: boolean;
};

type LegacyTable = {
  source_name: string;
  target_name: string;
  label: string;
  module: string;
  source_file: string;
  source_record_count: number;
  imported_record_count: number;
  imported_at: string | null;
  columns: LegacyColumn[];
};

const PAGE_SIZE = 25;

const COMMON_LABELS: Record<string, string> = {
  ccod: "Código",
  cnome: "Nome",
  ccgc: "CNPJ/CPF",
  cinsc: "Inscrição estadual",
  cend: "Endereço",
  cbair: "Bairro",
  ccep: "CEP",
  cfone: "Telefone",
  cemail: "E-mail",
  emailnfe: "E-mail NFe",
  codpro: "Código do produto",
  nompro: "Produto",
  unipro: "Unidade",
  pretab: "Preço de tabela",
  nnumpedi: "Número do pedido",
  nnropedi: "Número do pedido",
  nitepedi: "Item",
  nnumnota: "Número da nota",
  nnronota: "Número da nota",
  nitenota: "Item",
  ndatemis: "Data de emissão",
  ncodclie: "Código do cliente",
  ncodvend: "Código do vendedor",
  ncodprod: "Código do produto",
  ndesprod: "Descrição do produto",
  nqtdprod: "Quantidade",
  nvrunliq: "Valor unitário líquido",
  fcod: "Código",
  fnome: "Fornecedor",
  fend: "Endereço",
  fbair: "Bairro",
  fcep: "CEP",
  repcodi: "Código",
  repnome: "Representante",
  repende: "Endereço",
  repfon1: "Telefone",
  repsitu: "Situação",
  dnrtit: "Número do título",
  dclien: "Cliente",
  demiss: "Emissão",
  dvecto: "Vencimento",
  dvrtit: "Valor do título",
  dvrabe: "Valor em aberto",
};

function columnLabel(column: LegacyColumn) {
  return COMMON_LABELS[column.name] ?? column.source.replaceAll("_", " ");
}

function number(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-BR");
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return value.toLocaleString("pt-BR");
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(text)) {
    const parsed = new Date(text.length === 10 ? `${text}T12:00:00` : text);
    if (Number.isFinite(parsed.getTime())) return parsed.toLocaleDateString("pt-BR");
  }
  return text;
}

function useLegacyCatalog() {
  return useQuery({
    queryKey: ["admin", "dukamp", "legacy-tables"],
    queryFn: async () => {
      // O catálogo legado é gerado em runtime e não faz parte dos tipos automáticos do Supabase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("dukamp_legacy_tables")
        .select("*")
        .order("module")
        .order("label");
      if (error) throw error;
      return (data ?? []) as LegacyTable[];
    },
  });
}

function LegacyTableViewer({ table, onBack }: { table: LegacyTable; onBack: () => void }) {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const columns = table.columns ?? [];
  const visibleColumns = columns.slice(0, 10);

  const rows = useQuery({
    queryKey: ["admin", "dukamp", table.target_name, page, search],
    queryFn: async () => {
      const from = (page - 1) * PAGE_SIZE;
      // Os 172 nomes de tabela vêm do catálogo protegido e são validados pela migration.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any).from(table.target_name).select("*", { count: "exact" });
      const safeSearch = search.replace(/[(),.%]/g, " ").trim();
      if (safeSearch) {
        const searchable = columns.filter((column) => column.searchable).slice(0, 8);
        if (searchable.length) {
          query = query.or(
            searchable.map((column) => `${column.name}.ilike.%${safeSearch}%`).join(","),
          );
        }
      }
      const { data, error, count } = await query
        .order("_row_id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      return { rows: (data ?? []) as Record<string, unknown>[], count: count ?? 0 };
    },
  });

  const totalPages = Math.max(1, Math.ceil((rows.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={onBack} aria-label="Voltar ao catálogo">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{table.label}</h1>
              <Badge variant="outline">{table.source_name.toUpperCase()}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {table.module} · origem: {table.source_file} · somente leitura
            </p>
          </div>
        </div>
        <div className="rounded-lg border bg-card px-4 py-2 text-sm">
          <strong>{number(rows.data?.count ?? table.imported_record_count)}</strong> registros
        </div>
      </div>

      <form
        className="flex max-w-2xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(searchInput.trim());
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            className="pl-9"
            placeholder="Pesquisar nos campos de texto desta tabela..."
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              setSearchInput("");
              setPage(1);
            }}
          >
            Limpar
          </Button>
        )}
      </form>

      {rows.isError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível consultar esta tabela:{" "}
          {rows.error instanceof Error ? rows.error.message : "erro desconhecido"}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                {visibleColumns.map((column) => (
                  <TableHead key={column.name}>{columnLabel(column)}</TableHead>
                ))}
                <TableHead className="text-right">Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.isPending && (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {rows.data?.rows.map((row) => (
                <TableRow key={String(row._row_id)}>
                  {visibleColumns.map((column) => (
                    <TableCell
                      key={column.name}
                      className="max-w-64 truncate"
                      title={String(row[column.name] ?? "")}
                    >
                      {displayValue(row[column.name])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRow(row)}>
                      <Eye className="mr-1 h-4 w-4" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rows.data && rows.data.rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + 1}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((value) => value + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>

      <Dialog
        open={Boolean(selectedRow)}
        onOpenChange={(open) => {
          if (!open) setSelectedRow(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto">
          <DialogHeader>
            <DialogTitle>Registro completo — {table.label}</DialogTitle>
          </DialogHeader>
          <dl className="grid gap-3 sm:grid-cols-2">
            {selectedRow &&
              columns.map((column) => (
                <div key={column.name} className="rounded-lg border bg-muted/20 p-3">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {columnLabel(column)} <span className="normal-case">({column.source})</span>
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                    {displayValue(selectedRow[column.name])}
                  </dd>
                </div>
              ))}
          </dl>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DukampLegacyArchive() {
  const catalog = useLegacyCatalog();
  const [selected, setSelected] = useState<LegacyTable | null>(null);
  const [search, setSearch] = useState("");
  const [module, setModule] = useState("Todos");
  const tables = useMemo(() => catalog.data ?? [], [catalog.data]);
  const modules = useMemo(
    () => ["Todos", ...Array.from(new Set(tables.map((table) => table.module)))],
    [tables],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return tables.filter(
      (table) =>
        (module === "Todos" || table.module === module) &&
        (!term ||
          `${table.label} ${table.source_name} ${table.source_file}`
            .toLocaleLowerCase("pt-BR")
            .includes(term)),
    );
  }, [tables, search, module]);

  if (selected) return <LegacyTableViewer table={selected} onBack={() => setSelected(null)} />;

  const imported = tables.reduce((sum, table) => sum + Number(table.imported_record_count || 0), 0);
  const sourceRecords = tables.reduce(
    (sum, table) => sum + Number(table.source_record_count || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 sm:p-8">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> Arquivo histórico somente leitura
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight">Dukamp</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Consulta centralizada dos dados preservados do sistema Clipper: faturamento, compras,
              estoque, financeiro, clientes, fornecedores, vendedores e tabelas auxiliares.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-background/70 p-4">
              <Database className="h-5 w-5 text-primary" />
              <div className="mt-2 text-2xl font-bold">{tables.length || "—"}</div>
              <div className="text-xs text-muted-foreground">tabelas</div>
            </div>
            <div className="rounded-xl border bg-background/70 p-4">
              <Boxes className="h-5 w-5 text-primary" />
              <div className="mt-2 text-2xl font-bold">{number(imported || sourceRecords)}</div>
              <div className="text-xs text-muted-foreground">registros</div>
            </div>
            <div className="col-span-2 rounded-xl border bg-background/70 p-4 sm:col-span-1">
              <FileArchive className="h-5 w-5 text-primary" />
              <div className="mt-2 text-2xl font-bold">
                {modules.length > 1 ? modules.length - 1 : "—"}
              </div>
              <div className="text-xs text-muted-foreground">módulos</div>
            </div>
          </div>
        </div>
      </div>

      {catalog.isError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
          <h2 className="font-semibold">
            A estrutura histórica ainda não foi publicada no Supabase.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A interface está pronta, mas a migration e a importação dos DBFs precisam ser executadas
            antes da consulta.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Localizar clientes, notas, pedidos, fornecedores..."
          />
        </div>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={module}
          onChange={(event) => setModule(event.target.value)}
        >
          {modules.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {catalog.isPending ? (
        <div className="py-16 text-center text-muted-foreground">
          Carregando catálogo histórico...
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((table) => (
            <Card key={table.source_name} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <TableProperties className="h-5 w-5" />
                  </div>
                  <Badge variant={table.imported_at ? "secondary" : "outline"}>
                    {table.source_name.toUpperCase()}
                  </Badge>
                </div>
                <CardTitle className="pt-3 text-lg">{table.label}</CardTitle>
                <CardDescription>{table.module}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex items-end justify-between gap-3 pt-0">
                <div className="text-sm">
                  <strong>
                    {number(table.imported_record_count || table.source_record_count)}
                  </strong>
                  <div className="text-xs text-muted-foreground">
                    registros · {table.columns.length} campos
                  </div>
                </div>
                <Button size="sm" onClick={() => setSelected(table)}>
                  Abrir
                </Button>
              </CardContent>
            </Card>
          ))}
          {!filtered.length && !catalog.isError && (
            <div className="col-span-full rounded-xl border p-10 text-center text-muted-foreground">
              Nenhuma tabela corresponde ao filtro.
            </div>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p>
          Esta área preserva o histórico do ERP original. Alterações operacionais continuam nas
          áreas atuais do painel para evitar divergência com os registros fiscais antigos.
        </p>
      </div>
    </div>
  );
}
