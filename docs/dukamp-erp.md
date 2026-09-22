# ERP Dukamp

O ERP web substitui gradualmente os executáveis compilados da pasta `WORK`.
Como não existem fontes `.PRG`, os módulos são reconstruídos pela combinação de:

- menus e textos extraídos estaticamente dos executáveis;
- estruturas e relacionamentos dos DBFs;
- dados históricos preservados no Supabase;
- validação dos fluxos com os usuários responsáveis.

## Princípios

1. As 172 tabelas `dukamp_legacy_*` são imutáveis e servem como auditoria.
2. Operações novas usam tabelas normalizadas, RLS e trilha de auditoria.
3. Fluxos que alteram várias entidades usam funções transacionais no PostgreSQL.
4. Todos os administradores podem acessar os módulos Dukamp.
5. Estoque, financeiro e documentos fiscais só mudam após uma ação explícita.

## Compras

Primeiro módulo operacional, disponível em `/admin/dukamp/compras`.

### Recursos entregues

- fornecedores novos e 2.273 fornecedores migrados;
- cadastro operacional de 4.186 produtos;
- 2.653 pedidos e seus itens migrados;
- criação e aprovação de pedidos de compra;
- recebimento parcial ou total;
- entrada de nota vinculada ao pedido;
- atualização atômica de quantidade recebida, estoque e custo;
- geração opcional de conta a pagar no recebimento;
- 16.289 entradas e 37.577 itens de entrada migrados;
- 46.208 títulos a pagar migrados;
- consultas de margem, estoque negativo e sugestão de compras;
- histórico da origem (sistema anterior ou ERP web);
- auditoria de inclusões, alterações e exclusões.

As funções `dukamp_create_purchase_order`, `dukamp_set_purchase_order_status`
e `dukamp_receive_purchase_order` validam o papel de administrador e executam
cada fluxo em uma única transação.

## Módulos identificados

- Compras;
- Almoxarifado e estoque;
- Contas a pagar;
- Contas a receber/valores a receber;
- Faturamento, pedidos, notas e NFe;
- Coordenação de vendas, preços, metas e comissões;
- Televendas e relacionamento com clientes;
- Receitas e controles fiscais;
- Logística, fretes, roteiros e carregamentos;
- rotinas auxiliares de boleto, XML, e-mail e manutenção.

Os próximos módulos devem reutilizar os cadastros operacionais de produtos,
fornecedores e movimentações criados por Compras, evitando bases duplicadas.
