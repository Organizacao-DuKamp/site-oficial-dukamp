export const AUDIT_AREAS: Record<string, string> = {
  web_order_sales: "Vendas pagas pelo site",
  products: "Produtos do site", erp_products: "Produtos do ERP", orders: "Pedidos", order_items: "Itens dos pedidos",
  dukamp_stock_items: "Estoque DuKamp", admin_access: "Acessos administrativos", profiles: "Contas", user_roles: "Permissões",
  erp_suppliers: "Fornecedores", erp_purchase_orders: "Compras", erp_product_units: "Unidades de medida",
  erp_product_areas: "Responsáveis pelos produtos", erp_seller_locations: "Unidades dos vendedores",
  site_settings: "Configurações do site", support_messages: "Mensagens", support_tickets: "Atendimentos",
  dukamp_expense_monthly_values: "Despesas", dukamp_bank_reports: "Registros bancários",
  dukamp_expense_categories: "Categorias de despesas", dukamp_expense_subcategories: "Tipos de despesas",
  catalogs: "Catálogos", categories: "Categorias de produtos", banners: "Banners", institutional_ads: "Anúncios institucionais",
  sellers: "Vendedores", customers: "Clientes", seller_clients: "Clientes dos vendedores", seller_quotes: "Orçamentos",
  seller_quote_items: "Itens dos orçamentos", sales_quotes: "Orçamentos de vendas", sales_quote_items: "Itens dos orçamentos",
  seller_sale_requests: "Solicitações de venda", account_requests: "Solicitações de conta", password_recovery_requests: "Recuperação de acesso",
  seller_monthly_margin_reports: "Relatórios de margens", seller_margin_report_snapshots: "Relatórios de vendas",
  erp_missing_merchandise: "Mercadorias em falta", import_logs: "Importações",
};
export const AUDIT_ACTIONS: Record<string, string> = { insert: "Cadastro", update: "Alteração", delete: "Exclusão", admin_login: "Entrada no painel" };
const FIELDS: Record<string, string> = {
  delivery_address: "Endereço de entrega", referencia_entrega: "Referência para entrega", pessoa_autorizada: "Pessoa autorizada a receber",
  seller_id: "Vendedor", seller_record_id: "Vendedor responsável", seller_name: "Nome do vendedor", seller_code: "Código do vendedor",
  web_registered: "Cliente cadastrado pelo site", payment_total: "Total pago", cost_amount: "Custo dos produtos", weight_kg: "Peso em kg", paid_at: "Pagamento confirmado em", erp_stock_synced_at: "Estoque do ERP atualizado em",
  status: "Situação", closed_at: "Encerrado em", closed_by: "Encerrado por", user_id: "Cliente / titular", actor_id: "Responsável",
  name: "Nome", full_name: "Nome completo", title: "Título", titulo: "Título", descricao: "Descrição", description: "Descrição",
  code: "Código", codigo: "Código", order_number: "Número do pedido", email: "E-mail", phone: "Telefone", message: "Mensagem",
  customer_name: "Nome do cliente", cliente: "Cliente", customer_id: "Cliente", sender_id: "Quem enviou", sender_role: "Tipo de remetente",
  ticket_id: "Atendimento", order_id: "Pedido", product_id: "Produto", category_id: "Categoria", catalog_id: "Catálogo",
  delivery_status: "Situação da entrega", payment_status: "Situação do pagamento", payment_method: "Forma de pagamento",
  fulfillment_method: "Forma de recebimento", pickup_location: "Loja de retirada", pickup_ready_at: "Pronto para retirada em",
  pickup_deadline_at: "Prazo de retirada", cancelled_at: "Cancelado em", cancelled_by: "Cancelado por", cancellation_reason: "Motivo do cancelamento",
  refund_status: "Situação do reembolso", refund_requested_at: "Reembolso solicitado em", refund_completed_at: "Reembolsado em",
  refund_completed_by: "Reembolso registrado por", delivered_at: "Entregue em", delivery_notified: "Cliente avisado da entrega",
  stock: "Quantidade em estoque", quantity: "Quantidade", minimum: "Estoque mínimo", unit: "Unidade de medida", unidade: "Unidade de medida",
  price: "Preço de venda", consumer_price: "Preço para consumidor", producer_price: "Preço para produtor rural", unit_price: "Preço por unidade",
  sale_price: "Preço de venda", cost: "Custo", total_cost: "Custo total", total_sale: "Valor total de venda", subtotal: "Subtotal", total: "Total",
  tax_amount: "Impostos", shipping_cost: "Frete", shipping_service: "Tipo de frete", shipping_deadline_days: "Prazo de entrega em dias",
  payment_fee: "Taxa de pagamento", payment_base_amount: "Valor antes da taxa", card_installments: "Número de parcelas",
  active: "Ativo", on_sale: "Em promoção", brand: "Marca", marca: "Marca", supplier_code: "Código do fornecedor", supplier_id: "Fornecedor",
  sale_consumer_price: "Preço promocional para consumidor", sale_producer_price: "Preço promocional para produtor",
  image_url: "Imagem", images: "Imagens", link_url: "Link de destino", target_url: "Link de destino", slug: "Endereço da página",
  created_at: "Cadastrado em", updated_at: "Última atualização", last_message_at: "Última mensagem em", read_by_admin: "Lida pela administração",
  read_by_user: "Lida pelo cliente", reviewed_at: "Analisado em", reviewed_by: "Analisado por", review_notes: "Observação da análise",
  role: "Permissão de acesso", account_type: "Tipo de conta", requested_type: "Tipo de conta solicitado", approval_notified: "Aprovação comunicada",
  product_data: "Dados do produto", pricing_data: "Preços e margens", value: "Valor / conteúdo", key: "Configuração", sort_order: "Ordem de exibição",
  year: "Ano", month: "Mês", amount: "Valor", notes: "Observações", tax_code: "Tributação", tax_destination_uf: "Estado de destino",
  cep: "CEP", rua: "Rua", numero: "Número", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", estado: "Estado", uf: "Estado",
  peso: "Peso", altura: "Altura", largura: "Largura", comprimento: "Comprimento", tracking_code: "Código de rastreio", tracking_status: "Situação do rastreio",
  posted_at: "Enviado em", tracking_updated_at: "Rastreio atualizado em", shipping_error: "Problema no envio", shipping_label_url: "Etiqueta de envio",
  label_created_at: "Etiqueta gerada em", icms_rate: "Alíquota de ICMS", base_unit_price: "Preço base por unidade",
  custo_real: "Custo real", custo_final: "Custo final", valor_minimo: "Valor mínimo", prazo_venda: "Prazo de venda em dias",
  percentual_margens: "Margens de venda", faixas: "Faixas de preço", produtor: "Preço para produtor", revenda: "Preço para revenda", tabela: "Preço de tabela",
  margem_configurada: "Margem configurada", margem_bruta: "Margem bruta", comissao_interna: "Comissão interna", prazo_dias: "Prazo em dias",
};
const MONEY = new Set(["price","consumer_price","producer_price","unit_price","sale_price","cost","total_cost","total_sale","subtotal","total","tax_amount","shipping_cost","payment_fee","payment_base_amount","sale_consumer_price","sale_producer_price","amount","custo_real","custo_final","valor_minimo","produtor","revenda","tabela","base_unit_price","payment_total","cost_amount"]);
const STATUS: Record<string, string> = {
  open: "Aberto", closed: "Encerrado", pending: "Pendente", approved: "Aprovado", rejected: "Recusado", cancelled: "Cancelado",
  refunded: "Reembolsado", requested: "Solicitado", none: "Sem solicitação", in_process: "Em análise", preparando: "Preparando",
  pronto: "Pronto para retirada", a_caminho: "A caminho", entregue: "Entregue", cancelada: "Cancelada", draft: "Rascunho", accepted: "Aceito",
  expired: "Expirado", paid: "Pago", completed: "Concluído", sent: "Enviado", received: "Recebido",
};
const OPTIONS: Record<string, Record<string, string>> = {
  payment_method: { pix: "Pix", card: "Cartão", boleto: "Boleto" }, fulfillment_method: { pickup: "Retirada na loja", delivery: "Entrega no endereço" },
  pickup_location: { rio_preto: "Filial de São José do Rio Preto", monte_aprazivel: "Matriz de Monte Aprazível" },
  role: { admin: "Administrador", user: "Cliente", seller: "Vendedor" }, sender_role: { admin: "Administrador", user: "Cliente", customer: "Cliente", seller: "Vendedor" },
  account_type: { cliente: "Cliente", produtor: "Produtor rural", revenda: "Revendedor" },
};
export type AuditRow = {
  id: string; created_at: string; action: string; entity_table: string; entity_id?: string;
  actor_id?: string | null; actor_name?: string | null; actor_email?: string | null; actor_ip?: string | null;
  changed_fields: string[]; before_data?: Record<string, unknown> | null; after_data?: Record<string, unknown> | null;
  people?: Record<string, string>; record_label?: string;
};
export const isAuditUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function auditLabel(key: string) {
  if (FIELDS[key]) return FIELDS[key];
  if (/^\d+$/.test(key)) return `Item ${Number(key)+1}`;
  const readable = key.replace(/_/g, " ");
  return readable.charAt(0).toUpperCase()+readable.slice(1);
}
export function auditDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.split("-").reverse().join("/");
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date);
}
export function auditValue(key: string, value: unknown, people: Record<string, string> = {}) {
  if (/encrypted|cipher|hash|password|senha|token|secret|api_key/i.test(key)) return "Informação protegida";
  if (value === null || value === undefined || value === "") return "Não informado";
  if (value === "[protegido]") return "Informação protegida";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (isAuditUuid(value)) return people[`${key}:${value}`] || people[value] || "Cadastro vinculado";
  if (typeof value === "string") {
    if ((key.endsWith("_at") || key.endsWith("_date") || key === "date") && /^\d{4}-\d{2}-\d{2}/.test(value)) return auditDate(value);
    if (OPTIONS[key]?.[value]) return OPTIONS[key][value];
    if ((key.endsWith("status") || key === "status") && STATUS[value]) return STATUS[value];
  }
  const numeric = typeof value === "number" ? value : typeof value === "string" && /^-?\d+(?:[.,]\d+)?$/.test(value) ? Number(value.replace(",", ".")) : NaN;
  if (MONEY.has(key) && Number.isFinite(numeric)) return new Intl.NumberFormat("pt-BR", { style:"currency",currency:"BRL" }).format(numeric);
  if (/percent|margem|icms_rate|comissao/.test(key) && Number.isFinite(numeric)) return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits:4 }).format(numeric)}%`;
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits:4 }).format(value);
  return String(value);
}
export function auditFields(row: AuditRow) {
  return (row.changed_fields || []).filter(key => !["id","updated_at"].includes(key) && !/(password|senha|token|secret|api_key|qr_code|session_id)/i.test(key));
}
export function auditRecord(row: AuditRow) {
  if (row.record_label) return row.record_label;
  const data = row.after_data || row.before_data || {};
  if (row.entity_table === "admin_access") return "Painel administrativo";
  if (row.entity_table === "support_tickets") return `Atendimento${data.user_id && row.people?.[String(data.user_id)] ? ` de ${row.people[String(data.user_id)]}` : " ao cliente"}`;
  if (row.entity_table === "orders") return `Pedido ${data.order_number || "do cliente"}`;
  const name = data.name || data.full_name || data.customer_name || data.cliente || data.title || data.titulo || data.descricao;
  if (name) return String(name);
  if (data.key) return auditLabel(String(data.key));
  const code = data.code || data.codigo;
  if (code) return `Código ${code}`;
  return AUDIT_AREAS[row.entity_table] || "Registro do site";
}
export function auditSummary(row: AuditRow) {
  if (row.action === "admin_login") return "Entrou no painel administrativo";
  const before = row.before_data || {}; const after = row.after_data || {};
  if (row.action === "update" && row.entity_table === "support_tickets" && before.status !== after.status) {
    if (after.status === "closed") return "Encerrou o atendimento";
    if (after.status === "open") return "Reabriu o atendimento";
  }
  if (row.action === "update" && row.entity_table === "orders") {
    if (before.refund_status !== after.refund_status && after.refund_status === "refunded") return "Registrou o reembolso como concluído";
    if (before.refund_status !== after.refund_status && after.refund_status === "requested") return "Solicitou o reembolso do pedido";
    if (before.delivery_status !== after.delivery_status && after.delivery_status === "cancelada") return "Cancelou a entrega";
    if (before.delivery_status !== after.delivery_status && after.delivery_status === "pronto") return "Marcou o pedido como pronto para retirada";
    if (before.delivery_status !== after.delivery_status && after.delivery_status === "entregue") return "Marcou o pedido como entregue";
  }
  if (row.action === "update" && row.changed_fields.length === 1 && row.changed_fields[0] === "stock") return "Atualizou a quantidade em estoque";
  return ({ insert:"Cadastrou um registro", update:"Alterou informações", delete:"Excluiu um registro" } as Record<string,string>)[row.action] || "Registrou uma ação";
}
export function auditChanges(row: AuditRow) {
  const changes: Array<{ key:string;field:string;label:string;before:unknown;after:unknown }> = [];
  const object = (value:unknown): value is Record<string,unknown> => !!value && typeof value === "object" && !Array.isArray(value);
  function compare(path:string[],before:unknown,after:unknown) {
    if (row.action === "update" && JSON.stringify(before) === JSON.stringify(after)) return;
    if (path.length < 6 && (object(before) || object(after)) && (before == null || object(before)) && (after == null || object(after))) {
      const b = object(before) ? before : {}; const a = object(after) ? after : {};
      for (const key of new Set([...Object.keys(b),...Object.keys(a)])) {
        if (key !== "id" && !/(password|senha|token|secret|api_key|qr_code)/i.test(key)) compare([...path,key],b[key],a[key]);
      }
      return;
    }
    if (path.length < 6 && Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
      for (let index=0;index<after.length;index++) compare([...path,String(index)],before[index],after[index]);
      return;
    }
    const value = row.action === "delete" ? before : after;
    if (row.action !== "update" && (value === undefined || value === null || value === "")) return;
    changes.push({ key:path.join("."),field:path[path.length-1],label:path.map(auditLabel).join(" › "),before,after });
  }
  for (const key of auditFields(row)) compare([key],row.before_data?.[key],row.after_data?.[key]);
  return changes;
}
