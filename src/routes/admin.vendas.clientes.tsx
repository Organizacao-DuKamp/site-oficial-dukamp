import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { parseCustomerReport } from "@/lib/customers-report";
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
        searchPlaceholder="Pesquisar cliente por nome..."
        columns={[
          { key: "cliente", label: "Cliente" },
          { key: "codigo", label: "Código" },
          { key: "cnpj_cpf", label: "CNPJ/CPF", format: formatDocument },
          { key: "inscricao_estadual", label: "IE", format: emptyValue },
          {
            key: "endereco",
            label: "Endereço",
            format: (value, row) => [value, row.numero].filter(Boolean).join(", ") || "—",
          },
          {
            key: "cidade",
            label: "Cidade/UF",
            format: (value, row) => [value, row.uf].filter(Boolean).join("/") || "—",
          },
          { key: "telefone", label: "Telefone", format: emptyValue },
          { key: "celular", label: "Celular", format: emptyValue },
          { key: "data_cadastro", label: "Cadastro", format: formatDate },
          { key: "ultima_compra", label: "Últ. compra", format: formatDate },
          { key: "valor_ultima_compra", label: "Valor últ.", format: formatCurrency },
          { key: "data_maior_compra", label: "Maior compra", format: formatDate },
          { key: "valor_maior_compra", label: "Valor maior", format: formatCurrency },
          { key: "compra_ano", label: "Compra ano", format: formatCurrency },
          { key: "compra_ano_anterior", label: "Ano anterior", format: formatCurrency },
          { key: "media_atraso_dias", label: "Média atraso", format: emptyValue },
          { key: "maior_atraso_dias", label: "Maior atraso", format: emptyValue },
          { key: "repr", label: "REPR", format: emptyValue },
          { key: "classificacao_l", label: "L", format: emptyValue },
          { key: "conceito", label: "Conceito", format: emptyValue },
        ]}
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
        ]}
      />
    </div>
  );
}
