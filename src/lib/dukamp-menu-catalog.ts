export type DukampWorkspaceTab = "orders" | "receipts" | "suppliers" | "reports" | "payables";

export type DukampMenuAction = {
  key: string;
  label: string;
  tab: DukampWorkspaceTab;
  note?: string;
};

export type DukampProgramMenu = {
  id: string;
  title: string;
  executable: string;
  groups: Array<{
    title: string;
    shortcuts?: string[];
    actions: DukampMenuAction[];
  }>;
};

export const PURCHASING_LAUNCHER = [
  { id: "compras", shortcut: "1", label: "Compras", executable: "cmpmenus.exe" },
  { id: "compras-2", shortcut: "2", label: "Compras 2", executable: "cmpmenu2.exe" },
  { id: "almoxarifado", shortcut: "3", label: "Almoxarifado", executable: "cmpalmox.exe" },
  { id: "nfe-loja", shortcut: "4", label: "NFE LOJA", executable: "fmpntnfe.exe EX" },
  { id: "faturamento", shortcut: "5", label: "Faturamento", executable: "fmpmnfat.exe" },
  { id: "nfe-fabrica", shortcut: "6", label: "NFE FABRICA", executable: "fmpntnfe.exe FB" },
  { id: "gerente", shortcut: "9", label: "Menu Gerente", executable: "grpmenus.exe" },
  { id: "nova-tabela", shortcut: "7", label: "NOVA TABELA", executable: "b_TABELA.bat" },
] as const;

export const DUKAMP_PROGRAM_MENUS: Record<string, DukampProgramMenu> = {
  compras: {
    id: "compras",
    title: "MENU COMPRAS",
    executable: "cmpmenus.exe",
    groups: [
      {
        title: "MANUTENÇÃO / CADASTROS",
        shortcuts: ["1", "2", "3", "5", "6", "7", "8", "9", "0", "A"],
        actions: [
          { key: "price-table", label: "Tabela Preço / Produto", tab: "reports" },
          { key: "suppliers", label: "Fornecedores", tab: "suppliers" },
          { key: "purchase-orders", label: "Pedidos de Compra", tab: "orders" },
          {
            key: "seller-agenda",
            label: "Agenda Vendedores",
            tab: "suppliers",
            note: "cadastro auxiliar",
          },
          { key: "purchase-index", label: "Índices Preço / Valores Compras", tab: "reports" },
          { key: "product-goals", label: "Metas Vendas Produtos", tab: "reports" },
          { key: "units", label: "Unidades de Medida", tab: "reports" },
          { key: "payment-goals", label: "Metas Pagamentos Compras", tab: "payables" },
          { key: "product-areas", label: "Áreas Produtos / Responsável", tab: "reports" },
          { key: "delivery-route", label: "Roteiro de Entrega", tab: "receipts" },
        ],
      },
      {
        title: "RELATÓRIOS",
        shortcuts: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
        actions: [
          { key: "price-report", label: "Tabela de Preço", tab: "reports" },
          { key: "purchase-suggestion", label: "Produtos / Sugestão Compras", tab: "reports" },
          {
            key: "sales-award-products",
            label: "Vendas / Premiação Cliente / Produto",
            tab: "reports",
          },
          { key: "abc-supplier", label: "Curva ABC Fornecedor / Produto / Grupo", tab: "reports" },
          { key: "cost-sale", label: "Produtos Custo / Venda", tab: "reports" },
          { key: "abc-seller", label: "Curva ABC Vendedor / Clientes", tab: "reports" },
          { key: "sales-award-orders", label: "Vendas / Premiação Pedidos", tab: "reports" },
          { key: "pis-cofins", label: "Compras Produtos PIS / COFINS", tab: "receipts" },
          { key: "promotions", label: "Produtos em Promoção", tab: "reports" },
          { key: "abc-purchases", label: "Curva ABC Compras", tab: "reports" },
        ],
      },
      {
        title: "CONSULTAS",
        shortcuts: ["1", "3", "4", "5", "6", "7", "8", "9", "0", "A"],
        actions: [
          { key: "sales-margin", label: "Margem Venda", tab: "reports" },
          {
            key: "sales-invoices",
            label: "Notas Fiscal Venda",
            tab: "receipts",
            note: "arquivo fiscal",
          },
          {
            key: "customer-titles",
            label: "Clientes / Títulos",
            tab: "payables",
            note: "financeiro",
          },
          { key: "supplier-titles", label: "Fornecedor / Títulos", tab: "payables" },
          { key: "sales-orders", label: "Pedidos Venda", tab: "orders", note: "faturamento" },
          { key: "sales-commission", label: "Comissão Venda", tab: "reports" },
          { key: "commission-test", label: "Comissão (Teste)", tab: "reports" },
          { key: "product-award", label: "Prêmio Metas Venda Produto", tab: "reports" },
          { key: "seller-goal", label: "Meta Venda por Vendedor", tab: "reports" },
          { key: "product-log", label: "Log Produtos", tab: "reports" },
        ],
      },
    ],
  },
  "compras-2": {
    id: "compras-2",
    title: "MENU COMPRAS 2",
    executable: "cmpmenu2.exe",
    groups: [
      {
        title: "MANUTENÇÃO / CADASTROS",
        shortcuts: ["1", "2", "3", "4", "5", "6", "8", "9", "0", "B"],
        actions: [
          { key: "purchase-orders", label: "Pedidos de Compra", tab: "orders" },
          { key: "product-movement", label: "Movimentações Produtos", tab: "receipts" },
          { key: "purchase-entry", label: "Entrada Notas Compra", tab: "receipts" },
          { key: "release-entry", label: "Liberar Produto Notas Compra", tab: "receipts" },
          { key: "suppliers", label: "Fornecedores", tab: "suppliers" },
          { key: "product-groups", label: "Grupo Produtos", tab: "reports" },
          { key: "seller-goals", label: "Metas Vendas Vendedor Mensal", tab: "reports" },
          { key: "seller-block", label: "Bloqueio Vendedor para Venda", tab: "reports" },
          { key: "price-table", label: "Tabela Preço / Produto", tab: "reports" },
          { key: "validity", label: "Validades Produtos", tab: "reports" },
        ],
      },
      {
        title: "RELATÓRIOS",
        shortcuts: ["1", "2", "3", "4", "6", "7", "8", "9", "0", "A", "C", "D", "E", "F", "G"],
        actions: [
          { key: "open-orders", label: "Pedidos Compra em Aberto", tab: "orders" },
          { key: "open-orders-summary", label: "Resumo Pedidos em Aberto", tab: "orders" },
          { key: "purchase-icms", label: "Notas Compra / ICMS", tab: "receipts" },
          { key: "matrix-stock", label: "Matriz Levantamento Saldo", tab: "reports" },
          { key: "negative-stock", label: "Produtos Saldo Negativo", tab: "reports" },
          { key: "product-check", label: "Conferência Produtos", tab: "reports" },
          { key: "product-groups-report", label: "Grupo Produtos", tab: "reports" },
          { key: "unreleased-notes", label: "Notas Compra Não Liberadas", tab: "receipts" },
          { key: "segment-purchases", label: "Compras por Segmento", tab: "reports" },
          { key: "stock-difference", label: "Faltam / Excesso Saldo Produtos", tab: "reports" },
          { key: "freight-documents", label: "Conhecimentos Fretes", tab: "receipts" },
          { key: "validity-report", label: "Validade Produtos", tab: "reports" },
          { key: "purchase-cfop", label: "Notas Compra / ICMS por CFOP", tab: "receipts" },
          { key: "purchase-goals", label: "Metas Compras", tab: "reports" },
          { key: "changed-prices", label: "Produtos Alterados Preço", tab: "reports" },
        ],
      },
      {
        title: "CONSULTAS",
        shortcuts: ["1", "2", "3", "4", "5", "6"],
        actions: [
          { key: "sales-invoices", label: "Notas Fiscal Venda", tab: "receipts" },
          { key: "customer-titles", label: "Clientes / Títulos", tab: "payables" },
          { key: "product-log", label: "Log Produtos", tab: "reports" },
          { key: "supplier-titles", label: "Fornecedor / Títulos", tab: "payables" },
          { key: "change-product-group", label: "Altera Grupo Produtos", tab: "reports" },
          { key: "cancel-orders", label: "Cancelamento Pedidos", tab: "orders" },
        ],
      },
    ],
  },
  almoxarifado: {
    id: "almoxarifado",
    title: "MENU ALMOXARIFADO",
    executable: "cmpalmox.exe",
    groups: [
      {
        title: "MANUTENÇÃO / CADASTROS",
        shortcuts: ["1", "2", "4", "5", "7", "8", "9", "0", "A"],
        actions: [
          {
            key: "warehouse-movement",
            label: "Movimentações Produtos Almoxarifado",
            tab: "receipts",
          },
          {
            key: "stock-inconsistency",
            label: "Movimentações Inconsistência Saldo",
            tab: "reports",
          },
          { key: "freight-payable", label: "Controle Frete a Pagar", tab: "payables" },
          { key: "purchase-orders", label: "Pedidos Compra", tab: "orders" },
          { key: "validity", label: "Validades Produtos", tab: "reports" },
          { key: "product-location", label: "Alteração Produto / Local", tab: "reports" },
          { key: "purchase-entry", label: "Entrada Notas Compra", tab: "receipts" },
          { key: "suppliers", label: "Manutenção Fornecedores", tab: "suppliers" },
          { key: "factory-movement", label: "Movimentações Produtos Fábrica", tab: "receipts" },
        ],
      },
      {
        title: "RELATÓRIOS",
        shortcuts: ["1", "2", "3", "5", "6", "7", "8", "9", "B", "C", "D"],
        actions: [
          {
            key: "warehouse-balance",
            label: "Matriz Levantamento Saldo Almoxarifado",
            tab: "reports",
          },
          { key: "count-difference", label: "Saldo Inconsistência Contagem", tab: "reports" },
          {
            key: "movement-check",
            label: "Conferência Produto Movimento Almoxarifado",
            tab: "reports",
          },
          { key: "open-orders", label: "Pedidos Compra em Aberto", tab: "orders" },
          { key: "matrix-balance", label: "Matriz Levantamento Saldo", tab: "reports" },
          { key: "negative-stock", label: "Produtos Saldo Negativo", tab: "reports" },
          { key: "replacement", label: "Conferência / Reposição / Geral", tab: "reports" },
          { key: "unreleased-notes", label: "Notas Compra Não Liberadas", tab: "receipts" },
          { key: "validity-report", label: "Validade Produtos", tab: "reports" },
          { key: "package-check", label: "Notas / Itens Não Confirmados Pacote", tab: "receipts" },
          { key: "pending-orders", label: "Pedidos Pendência em Aberto", tab: "orders" },
        ],
      },
      {
        title: "CONSULTAS",
        shortcuts: ["1", "2", "3", "4"],
        actions: [
          { key: "sales-invoices", label: "Notas Fiscal Venda", tab: "receipts" },
          { key: "product-log", label: "Log Produtos", tab: "reports" },
          { key: "products-table", label: "Produtos / Tabela", tab: "reports" },
          { key: "supplier-titles", label: "Fornecedor / Títulos", tab: "payables" },
        ],
      },
    ],
  },
};

const simpleProgram = (
  id: string,
  title: string,
  executable: string,
  actions: DukampMenuAction[],
): DukampProgramMenu => ({ id, title, executable, groups: [{ title: "OPERAÇÕES", actions }] });

DUKAMP_PROGRAM_MENUS["nfe-loja"] = simpleProgram("nfe-loja", "NFE LOJA", "fmpntnfe.exe EX", [
  { key: "issue-nfe", label: "Emissão de NFe Loja", tab: "receipts" },
  { key: "sales-invoices", label: "Consulta Notas Fiscais", tab: "receipts" },
  { key: "xml-danfe", label: "XML / DANFE", tab: "receipts" },
]);
DUKAMP_PROGRAM_MENUS["nfe-fabrica"] = simpleProgram(
  "nfe-fabrica",
  "NFE FÁBRICA",
  "fmpntnfe.exe FB",
  [
    { key: "issue-nfe", label: "Emissão de NFe Fábrica", tab: "receipts" },
    { key: "factory-stock", label: "Movimentação Estoque Fábrica", tab: "receipts" },
    { key: "xml-danfe", label: "XML / DANFE", tab: "receipts" },
  ],
);
DUKAMP_PROGRAM_MENUS.faturamento = simpleProgram(
  "faturamento",
  "MENU FATURAMENTO",
  "fmpmnfat.exe",
  [],
);
DUKAMP_PROGRAM_MENUS.faturamento.groups = [
  {
    title: "MANUTENÇÕES",
    shortcuts: ["1", "2", "3", "5", "6", "7"],
    actions: [
      { key: "commission-values", label: "Valores Comissões", tab: "reports" },
      { key: "commission-discounts", label: "Descontos Comissões", tab: "reports" },
      { key: "customers", label: "Clientes", tab: "suppliers" },
      { key: "freight-percentages", label: "Percentuais de Frete", tab: "reports" },
      { key: "customer-rates", label: "Tabela / Taxas Cliente", tab: "reports" },
      { key: "delivery-route", label: "Roteiro de Entrega", tab: "receipts" },
    ],
  },
  {
    title: "RELATÓRIOS",
    shortcuts: ["2", "3", "4", "5", "6", "9", "0", "A", "B", "C", "D", "E", "F", "G", "H"],
    actions: [
      { key: "sales-commission", label: "Vendas / Comissões", tab: "reports" },
      { key: "invoice-release-password", label: "Senha Liberação Notas", tab: "reports" },
      { key: "open-sales-orders", label: "Pedidos em Aberto", tab: "orders" },
      { key: "sales-segment", label: "Vendas por Segmento", tab: "reports" },
      { key: "commission-segment", label: "Comissões por Segmento", tab: "reports" },
      { key: "cancelled-documents", label: "Notas / Pedidos Cancelados", tab: "receipts" },
      { key: "invoice-operations", label: "Operações / Notas", tab: "receipts" },
      { key: "tax-substitution-sales", label: "Vendas Substituição Tributária", tab: "reports" },
      { key: "pis-cofins-sales", label: "Venda Produtos PIS / COFINS", tab: "reports" },
      { key: "issued-invoices", label: "Notas Emitidas", tab: "receipts" },
      { key: "customer-credit-limit", label: "Clientes Limite Crédito", tab: "reports" },
      { key: "invoice-freight", label: "Fretes Notas Fiscais", tab: "payables" },
      { key: "invoice-bank-slips", label: "Emissão Boletos NF Laser", tab: "payables" },
      { key: "icms-sector", label: "ICMS por Setor", tab: "reports" },
      { key: "delivery-route-report", label: "Roteiro de Entrega", tab: "receipts" },
    ],
  },
  {
    title: "CONSULTAS",
    shortcuts: ["1", "2", "3", "4", "5"],
    actions: [
      { key: "sales-invoice-query", label: "Nota Fiscal", tab: "receipts" },
      { key: "customer-titles", label: "Clientes / Títulos", tab: "payables" },
      { key: "product-log", label: "Log Produtos", tab: "reports" },
      { key: "bank-slip-log", label: "Log Boletos", tab: "payables" },
      { key: "sales-orders", label: "Pedidos Venda", tab: "orders" },
    ],
  },
];
DUKAMP_PROGRAM_MENUS.gerente = {
  id: "gerente",
  title: "MENU COORDENAÇÃO DE VENDAS",
  executable: "grpmenus.exe",
  groups: [
    {
      title: "MANUTENÇÕES",
      shortcuts: ["1", "3", "4", "5", "6"],
      actions: [
        { key: "price-table", label: "Tabela Preço / Produto", tab: "reports" },
        { key: "sales-goals", label: "Metas Vendas Produtos", tab: "reports" },
        { key: "monthly-goals", label: "Metas Vendas Vendedor Mensal", tab: "reports" },
        { key: "seller-block", label: "Bloqueio Vendedor Emissão Nota", tab: "reports" },
        { key: "customer-rates", label: "Tabela / Taxas / E-mail Cliente", tab: "reports" },
      ],
    },
    {
      title: "RELATÓRIOS",
      shortcuts: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "A", "B", "C"],
      actions: [
        { key: "open-orders", label: "Pedidos Compra em Aberto", tab: "orders" },
        { key: "matrix-stock", label: "Matriz Levantamento Saldo", tab: "reports" },
        { key: "negative-stock", label: "Produtos Saldo Negativo", tab: "reports" },
        { key: "product-check", label: "Conferência Produtos", tab: "reports" },
        { key: "product-groups", label: "Grupo Produtos", tab: "reports" },
        { key: "unreleased-notes", label: "Notas Compra Não Liberadas", tab: "receipts" },
        {
          key: "sales-award-products",
          label: "Vendas / Premiação Cliente / Produto",
          tab: "reports",
        },
        { key: "abc-supplier", label: "Curva ABC Fornecedor / Produto / Grupo", tab: "reports" },
        { key: "abc-seller", label: "Curva ABC Vendedor / Clientes", tab: "reports" },
        { key: "sales-award-orders", label: "Vendas / Premiação Pedidos", tab: "reports" },
        { key: "stock-difference", label: "Faltam / Excesso Saldo Produtos", tab: "reports" },
        { key: "promotions", label: "Produtos em Promoção", tab: "reports" },
        { key: "validity-report", label: "Validade Produtos", tab: "reports" },
      ],
    },
    {
      title: "CONSULTAS",
      shortcuts: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      actions: [
        { key: "sales-margin", label: "Margem Venda", tab: "reports" },
        { key: "sales-invoices", label: "Notas Fiscal Venda", tab: "receipts" },
        { key: "customer-titles", label: "Clientes / Títulos", tab: "payables" },
        { key: "product-log", label: "Log Produtos", tab: "reports" },
        { key: "sales-orders", label: "Pedidos Venda", tab: "orders" },
        { key: "sales-commission", label: "Comissão Venda", tab: "reports" },
        { key: "commission-test", label: "Comissão (Teste)", tab: "reports" },
        { key: "product-award", label: "Prêmio Metas Venda Produto", tab: "reports" },
        { key: "seller-goal", label: "Meta Venda por Vendedor", tab: "reports" },
      ],
    },
  ],
};
DUKAMP_PROGRAM_MENUS["nova-tabela"] = simpleProgram("nova-tabela", "NOVA TABELA", "b_TABELA.bat", [
  { key: "price-table", label: "Tabela Preço / Produto", tab: "reports" },
  { key: "cost-sale", label: "Custo / Venda / Margem", tab: "reports" },
  { key: "changed-prices", label: "Histórico Alteração de Preços", tab: "reports" },
]);
