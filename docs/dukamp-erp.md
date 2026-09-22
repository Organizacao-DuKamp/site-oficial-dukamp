# ERP Dukamp

O ERP web substitui gradualmente os executáveis compilados da pasta `WORK`.
Como não existem fontes `.PRG`, os módulos são reconstruídos pela combinação de:

- lançadores `.MNU` e `.BAT` preservados na pasta `WMENUS`;
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

### Hierarquia original recuperada

O acesso reproduz o fluxo encontrado no sistema instalado, em vez de abrir diretamente um painel
genérico:

1. `COMPRAS.BAT` inicia o `MenuWin` com `W_COMPRAS.MNU`;
2. o lançador apresenta Compras, Compras 2, Almoxarifado, NFe Loja, Faturamento, NFe Fábrica,
   Menu Gerente e Nova Tabela na ordem original;
3. cada programa apresenta **1. Manutenção**, **2. Relatórios**, **3. Consultas**, **4. Operações
   Especiais** e **5. Sair**, com Esc voltando um nível;
4. os atalhos numéricos e alfabéticos preservam as lacunas originais (ex.: sem 4 em Compras);
5. cada rotina abre sua própria tela Clipper — `[ MANUTENCAO PEDIDO COMPRA ]`, `[ ENTRADA COMPRAS ]`,
   `[ TABELA PRECO ]`, `[ CONTROLE FRETE A PAGAR ]` etc. — com prompts, F2/PgDn/F6/Esc e DBFs de
   origem exibidos;
6. rotinas operacionais usam a base nova com auditoria; rotinas ainda não migradas ficam marcadas
   como **Consulta legada** e apontam para o arquivo histórico.

Evidência usada: 11 arquivos `.MNU` de `WMENUS`, desassemblagem do p-code Harbour
(`scripts/inspect_clipper.py`, 533 funções em `cmpmenus.exe`, 570 em `cmpmenu2.exe`, 481 em
`cmpalmox.exe`, zero erro de decodificação), `legacy_menu_strings.txt` e os DBFs preservados. Os
binários nunca são executados no navegador; a réplica é funcional, não emulação byte-a-byte. Emissão
fiscal, boletos e integrações bancárias continuam fora do escopo até validação legal/técnica.

### Cobertura WORK × WMENUS

- `W_COMPRAS.MNU`: 8 entradas replicadas na ordem e atalhos originais.
- `cmpmenus.exe` / `cmpmenu2.exe` / `cmpalmox.exe`: menus de segundo nível conferidos; `cmpalmox.exe`
  contém os submenus embutidos no próprio `MAIN`, incluindo separadores, `6. Codigo de Barras` e
  `A. Etiqueta Barra Impr`.
- `/admin/dukamp`: nova seção **Terminais originais (WMENUS)** lista os 11 lançadores com comandos;
  entradas de Compras/Almoxarifado ligam para a réplica, as demais ficam como **Legado** até a
  migração do módulo correspondente.

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
