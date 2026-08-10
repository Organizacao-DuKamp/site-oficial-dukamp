import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ResourceCrud } from "@/components/admin/ResourceCrud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/vendas/clientes")({
  component: CustomersAdmin,
});

type ImportedCustomer = {
  cliente: string;
  codigo: string;
  cidade: string | null;
  uf: string | null;
  contato: string | null;
  telefone: string | null;
  repr: string | null;
  ultima_compra: string | null;
  cob: string | null;
  cnpj_cpf: string | null;
  celular: string | null;
  email: string | null;
};

const clean = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || trimmed === "@" || trimmed === "@@" ? null : trimmed;
};

function parseDate(value: string): string | null {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `20${year}-${month}-${day}`;
}

function parseCustomerReport(text: string): ImportedCustomer[] {
  const customers: ImportedCustomer[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/[\u0000\u000c]/g, "");
    if (line.length < 52) continue;

    const codigo = line.slice(44, 52).trim();
    if (!/^\d+$/.test(codigo)) continue;

    const cliente = line.slice(1, 44).trim();
    if (!cliente) continue;

    customers.push({
      cliente,
      codigo,
      cidade: clean(line.slice(52, 74)),
      uf: clean(line.slice(74, 78)),
      contato: clean(line.slice(78, 95)),
      telefone: clean(line.slice(95, 110)),
      repr: clean(line.slice(110, 115)),
      ultima_compra: parseDate(line.slice(115, 124)),
      cob: clean(line.slice(124, 128)),
      cnpj_cpf: clean(line.slice(128, 143)),
      celular: clean(line.slice(143, 157)),
      email: clean(line.slice(157)),
    });
  }

  return customers;
}

function CustomerImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  async function importCustomers() {
    if (!file) {
      toast.error("Selecione o relatório de clientes.");
      return;
    }

    setImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const text = new TextDecoder("windows-1252").decode(buffer);
      const customers = parseCustomerReport(text);

      if (!customers.length) throw new Error("Nenhum cliente válido foi encontrado no arquivo.");

      const uniqueCustomers = Array.from(
        new Map(customers.map((customer) => [customer.codigo, customer])).values(),
      );

      const batchSize = 250;
      for (let i = 0; i < uniqueCustomers.length; i += batchSize) {
        const batch = uniqueCustomers.slice(i, i + batchSize);
        const { error } = await supabase
          .from("customers" as any)
          .upsert(batch as any, { onConflict: "codigo" });
        if (error) throw error;
      }

      toast.success(`${uniqueCustomers.length.toLocaleString("pt-BR")} clientes importados/atualizados.`);
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.message || "Falha ao importar clientes.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className="mb-2 text-sm font-medium">Importar relatório de clientes</p>
          <Input
            type="file"
            accept=".txt,.TXT,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </div>
        <Button type="button" onClick={importCustomers} disabled={!file || importing}>
          {importing ? "Importando..." : "Importar clientes"}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        O arquivo é processado no navegador e enviado diretamente ao banco protegido. Registros com o mesmo código são atualizados, não duplicados.
      </p>
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
          { key: "cidade", label: "Cidade" },
          { key: "uf", label: "UF" },
          { key: "contato", label: "Contato", format: (v) => v || "—" },
          { key: "telefone", label: "Telefone", format: (v) => v || "—" },
          { key: "repr", label: "REPR", format: (v) => v || "—" },
          {
            key: "ultima_compra",
            label: "Últ. Compra",
            format: (v) => v ? new Date(`${v}T12:00:00`).toLocaleDateString("pt-BR") : "—",
          },
          { key: "cob", label: "COB", format: (v) => v || "—" },
          { key: "cnpj_cpf", label: "CNPJ/CPF", format: (v) => v || "—" },
          { key: "celular", label: "Celular", format: (v) => v || "—" },
          { key: "email", label: "Email", format: (v) => v || "—" },
        ]}
        fields={[
          { name: "cliente", label: "Cliente", required: true },
          { name: "codigo", label: "Código", required: true },
          { name: "cidade", label: "Cidade" },
          { name: "uf", label: "UF" },
          { name: "contato", label: "Contato" },
          { name: "telefone", label: "Telefone" },
          { name: "repr", label: "REPR" },
          { name: "ultima_compra", label: "Última Compra" },
          { name: "cob", label: "COB" },
          { name: "cnpj_cpf", label: "CNPJ/CPF" },
          { name: "celular", label: "Celular" },
          { name: "email", label: "Email" },
        ]}
      />
    </div>
  );
}
