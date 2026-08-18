import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { parseCustomerReport } from "@/lib/customers-report";
import {
  CalendarDays,
  FileText,
  MapPin,
  Phone,
  Route as RouteIcon,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendas/clientes")({
  component: CustomersAdmin,
});

const emptyValue = (value: unknown) => String(value ?? "").trim() || "—";

function formatDate(value: unknown) {
  if (!value) return "—";
  return new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatCurrency(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "—";
  return `${numeric.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function formatDocument(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  return digits || "—";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Falha ao importar clientes.";
}

type CustomerRecord = Record<string, unknown>;

function CustomerDetailField({ label, value }: { label: string; value: ReactNode }) {
  const hasValue = value !== null && value !== undefined && value !== "";
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-line text-sm font-medium">{hasValue ? value : "—"}</dd>
    </div>
  );
}

function CustomerDetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatAddress(customer: CustomerRecord, payment = false) {
  const suffix = payment ? "_pagamento" : "";
  const street = [customer[`endereco${suffix}`], customer[`numero${suffix}`]]
    .filter(Boolean)
    .join(", ");
  const city = [customer[`cidade${suffix}`], customer[`uf${suffix}`]].filter(Boolean).join("/");
  const location = [customer[`bairro${suffix}`], city, customer[`cep${suffix}`]]
    .filter(Boolean)
    .join(" • ");
  return [street, location].filter(Boolean).join("\n") || "—";
}

function formatDelay(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  return `${value} dia${Number(value) === 1 ? "" : "s"}`;
}

function CustomerDetails({ customer }: { customer: CustomerRecord }) {
  const hasRoute = Boolean(String(customer.roteiro ?? "").trim());
  const sellerCode = String(customer.vendedor_codigo ?? "").trim();
  const sellerName = String(customer.vendedor_nome ?? "").trim();
  const sellerLabel = [sellerCode, sellerName].filter(Boolean).join(" - ") || "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Código {emptyValue(customer.codigo)}
          </p>
          <h2 className="mt-1 text-xl font-bold">{emptyValue(customer.cliente)}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {[customer.cidade, customer.uf].filter(Boolean).join("/") || "Cidade não informada"}
          </p>
        </div>
        <span
          className={
            hasRoute
              ? "w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
              : "w-fit rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
          }
        >
          {hasRoute ? "Roteiro disponível" : "Sem roteiro"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CustomerDetailSection title="Cadastro" icon={<FileText className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <CustomerDetailField label="CNPJ/CPF" value={formatDocument(customer.cnpj_cpf)} />
            <CustomerDetailField label="Inscrição estadual" value={emptyValue(customer.inscricao_estadual)} />
            <CustomerDetailField label="Data de cadastro" value={formatDate(customer.data_cadastro)} />
            <CustomerDetailField label="Contato" value={emptyValue(customer.contato)} />
            <CustomerDetailField label="Representante" value={emptyValue(customer.repr)} />
            <CustomerDetailField label="COB" value={emptyValue(customer.cob)} />
            <CustomerDetailField label="Classificação L" value={emptyValue(customer.classificacao_l)} />
            <CustomerDetailField label="Conceito" value={emptyValue(customer.conceito)} />
          </dl>
        </CustomerDetailSection>

        <CustomerDetailSection title="Vendedor responsável" icon={<UserRound className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <CustomerDetailField label="Vendedor" value={sellerLabel} />
            <CustomerDetailField
              label="Última compra com vendedor"
              value={formatDate(customer.vendedor_ultima_compra)}
            />
            <CustomerDetailField
              label="Total acumulado com vendedor"
              value={formatCurrency(customer.vendedor_total_acumulado)}
            />
            <CustomerDetailField label="% no vendedor" value={formatPercent(customer.vendedor_percentual)} />
            <CustomerDetailField
              label="% acumulado no vendedor"
              value={formatPercent(customer.vendedor_percentual_acumulado)}
            />
            <CustomerDetailField
              label="ABC (S / C / L)"
              value={[customer.abc_s, customer.abc_c, customer.abc_l].map(emptyValue).join(" / ")}
            />
          </dl>
        </CustomerDetailSection>

        <CustomerDetailSection title="Contato" icon={<Phone className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <CustomerDetailField label="Telefone" value={emptyValue(customer.telefone)} />
            <CustomerDetailField label="Telefone 2" value={emptyValue(customer.telefone_2)} />
            <CustomerDetailField label="Celular" value={emptyValue(customer.celular)} />
            <CustomerDetailField label="E-mail" value={emptyValue(customer.email)} />
          </dl>
        </CustomerDetailSection>

        <CustomerDetailSection title="Endereços" icon={<MapPin className="h-4 w-4" />}>
          <dl className="space-y-4">
            <CustomerDetailField label="Endereço principal" value={formatAddress(customer)} />
            <CustomerDetailField label="Endereço de pagamento" value={formatAddress(customer, true)} />
          </dl>
        </CustomerDetailSection>

        <CustomerDetailSection title="Compras" icon={<ShoppingCart className="h-4 w-4" />}>
          <dl className="grid gap-4 sm:grid-cols-2">
            <CustomerDetailField label="Última compra" value={formatDate(customer.ultima_compra)} />
            <CustomerDetailField label="Valor da última" value={formatCurrency(customer.valor_ultima_compra)} />
            <CustomerDetailField label="Maior compra" value={formatDate(customer.data_maior_compra)} />
            <CustomerDetailField label="Valor da maior" value={formatCurrency(customer.valor_maior_compra)} />
            <CustomerDetailField label="Compra no ano" value={formatCurrency(customer.compra_ano)} />
            <CustomerDetailField label="Ano anterior" value={formatCurrency(customer.compra_ano_anterior)} />
            <CustomerDetailField label="Média de atraso" value={formatDelay(customer.media_atraso_dias)} />
            <CustomerDetailField label="Maior atraso" value={formatDelay(customer.maior_atraso_dias)} />
          </dl>
        </CustomerDetailSection>
      </div>

      <CustomerDetailSection title="Roteiro de entrega" icon={<RouteIcon className="h-4 w-4" />}>
        {hasRoute ? (
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/50 p-4 font-sans text-sm leading-relaxed">
            {String(customer.roteiro)}
          </pre>
        ) : (
          <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
            Nenhum roteiro foi cadastrado para este cliente.
          </p>
        )}
      </CustomerDetailSection>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          Dados do relatório completo atualizados em {formatDate(customer.dados_relatorio_atualizados_em)}
        </span>
        <span className="flex items-center gap-2">
          <UserRound className="h-4 w-4" />
          Vendedor atualizado em {formatDate(customer.dados_vendedor_atualizados_em)}
        </span>
      </div>
    </div>
  );
}

function CustomerImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function importCustomers() {
    if (!file) {
      toast.error("Selecione o relatório completo de clientes.");
      return;
    }

    setImporting(true);
    setProgress("Lendo e validando o relatório...");
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("windows-1252").decode(buffer);
      const { customers, errors } = parseCustomerReport(text);

      if (errors.length) {
        const first = errors[0];
        throw new Error(
          `A importação foi cancelada: ${errors.length} registro(s) inválido(s). ` +
          `Primeiro erro na linha ${first.line}, código ${first.codigo}: ${first.reason}.`,
        );
      }
      if (!customers.length) throw new Error("Nenhum cliente válido foi encontrado no arquivo.");

      const uniqueCustomers = Array.from(
        new Map(customers.map((customer) => [customer.codigo, customer])).values(),
      );
      const importedAt = new Date().toISOString();
      const batchSize = 250;

      for (let i = 0; i < uniqueCustomers.length; i += batchSize) {
        const batch = uniqueCustomers.slice(i, i + batchSize).map((customer) => ({
          ...customer,
          dados_relatorio_atualizados_em: importedAt,
          updated_at: importedAt,
        }));
        setProgress(
          `Enviando ${Math.min(i + batch.length, uniqueCustomers.length).toLocaleString("pt-BR")} de ` +
          `${uniqueCustomers.length.toLocaleString("pt-BR")} clientes...`,
        );
        const { error } = await supabase
          .from("customers")
          .upsert(batch, { onConflict: "codigo" });
        if (error) throw error;
      }

      toast.success(
        `${uniqueCustomers.length.toLocaleString("pt-BR")} clientes importados/atualizados.`,
      );
      window.location.reload();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
      setProgress(null);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium">Importar relatório completo de clientes</p>
          <Input
            type="file"
            accept=".txt,.TXT,text/plain"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setProgress(null);
            }}
          />
        </div>
        <Button type="button" onClick={importCustomers} disabled={!file || importing}>
          {importing ? "Importando..." : "Importar clientes"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Compatível com o relatório FARCLIEN completo. Clientes com o mesmo código são atualizados sem
        apagar celular, e-mail ou COB já cadastrados no site.
      </p>
      {progress && <p className="mt-2 text-xs font-medium">{progress}</p>}
    </div>
  );
}

function CustomersAdmin() {
  return (
    <div className="space-y-6">
      <CustomerImporter />
      <ResourceCrud
        title="Clientes"
        table="customers"
        orderBy={{ column: "cliente", ascending: true }}
        searchField="cliente"
        searchFields={["cliente", "codigo", "cnpj_cpf", "cidade", "vendedor_nome"]}
        searchPlaceholder="Pesquisar por nome, código, CNPJ/CPF, cidade ou vendedor..."
        columns={[
          { key: "cliente", label: "Cliente" },
          { key: "codigo", label: "Código" },
          {
            key: "cidade",
            label: "Cidade/UF",
            format: (value, row) => [value, row.uf].filter(Boolean).join("/") || "—",
          },
          {
            key: "vendedor_nome",
            label: "Vendedor",
            format: (value, row) =>
              [row.vendedor_codigo, value].filter(Boolean).join(" - ") || "—",
          },
          {
            key: "telefone",
            label: "Contato",
            format: (value, row) => value || row.celular || "—",
          },
          { key: "ultima_compra", label: "Últ. compra", format: formatDate },
          { key: "valor_ultima_compra", label: "Valor últ.", format: formatCurrency },
          {
            key: "roteiro",
            label: "Roteiro",
            format: (value) => (
              <span
                className={
                  value
                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                    : "rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                }
              >
                {value ? "Disponível" : "Sem roteiro"}
              </span>
            ),
          },
        ]}
        renderDetails={(customer) => <CustomerDetails customer={customer} />}
        fields={[
          { name: "cliente", label: "Cliente", required: true },
          { name: "codigo", label: "Código", required: true },
          { name: "cnpj_cpf", label: "CNPJ/CPF" },
          { name: "inscricao_estadual", label: "Inscrição estadual" },
          { name: "contato", label: "Contato" },
          { name: "telefone", label: "Telefone" },
          { name: "telefone_2", label: "Telefone 2" },
          { name: "celular", label: "Celular" },
          { name: "email", label: "E-mail" },
          { name: "endereco", label: "Endereço" },
          { name: "numero", label: "Número" },
          { name: "bairro", label: "Bairro" },
          { name: "cidade", label: "Cidade" },
          { name: "uf", label: "UF" },
          { name: "cep", label: "CEP" },
          { name: "data_cadastro", label: "Data de cadastro", type: "date" },
          { name: "endereco_pagamento", label: "Endereço de pagamento" },
          { name: "numero_pagamento", label: "Número (pagamento)" },
          { name: "bairro_pagamento", label: "Bairro (pagamento)" },
          { name: "cidade_pagamento", label: "Cidade (pagamento)" },
          { name: "uf_pagamento", label: "UF (pagamento)" },
          { name: "cep_pagamento", label: "CEP (pagamento)" },
          { name: "ultima_compra", label: "Data da última compra", type: "date" },
          { name: "valor_ultima_compra", label: "Valor da última compra", type: "number", step: "0.01" },
          { name: "data_maior_compra", label: "Data da maior compra", type: "date" },
          { name: "valor_maior_compra", label: "Valor da maior compra", type: "number", step: "0.01" },
          { name: "media_atraso_dias", label: "Média de atraso (dias)", type: "number", step: "1" },
          { name: "maior_atraso_dias", label: "Maior atraso (dias)", type: "number", step: "1" },
          { name: "compra_ano", label: "Compra no ano", type: "number", step: "0.01" },
          { name: "compra_ano_anterior", label: "Compra no ano anterior", type: "number", step: "0.01" },
          { name: "repr", label: "REPR" },
          { name: "classificacao_l", label: "Classificação L" },
          { name: "conceito", label: "Conceito" },
          { name: "marcador_relatorio", label: "Marcador do relatório" },
          { name: "cob", label: "COB" },
          { name: "vendedor_codigo", label: "Código do vendedor" },
          { name: "vendedor_nome", label: "Vendedor responsável" },
          { name: "vendedor_ultima_compra", label: "Última compra com vendedor", type: "date" },
          { name: "vendedor_total_acumulado", label: "Total acumulado com vendedor", type: "number", step: "0.01" },
          { name: "vendedor_percentual", label: "% no vendedor", type: "number", step: "0.01" },
          { name: "vendedor_percentual_acumulado", label: "% acumulado no vendedor", type: "number", step: "0.01" },
          { name: "abc_s", label: "ABC - S" },
          { name: "abc_c", label: "ABC - C" },
          { name: "abc_l", label: "ABC - L" },
          { name: "roteiro", label: "Roteiro de entrega", type: "textarea" },
        ]}
      />
    </div>
  );
}
