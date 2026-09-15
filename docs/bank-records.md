# Registros bancários

Navegação: Despesas DuKamp → Controle bancário → Registros bancários.

`BankRecordsPanel` consulta `dukamp_bank_reports`, protegida pela mesma política
estrita de proprietário utilizada em `dukamp_expense_snapshots`. Visitantes não
têm privilégios e usuários autenticados só têm SELECT, sujeito a RLS.

O item de navegação é virtual (`BANK_RECORDS_CODE`), sem valores na tabela de
despesas. Assim, a importação dos relatórios não duplica totais da visão geral.

Cada relatório contém ano, mês, nome e SHA-256 da fonte e um payload com grupos,
rubricas, subtotais, memória de conciliação e texto integral extraído. Valores
monetários são inteiros em centavos. O total conciliado é original + ajuste;
linhas de subtotal/totalização não são novas movimentações. Ajustes negativos
são preservados. Os registros são agregados dos PDFs, não extratos transacionais
completos. Não há inferência de saldo bancário, favorecido ou data inexistente.

Os PDFs e dados financeiros reais ficam fora deste repositório público.
Novas importações devem validar todos os subtotais, soma dos grupos, ajuste e
total final antes de gravar. A chave (year, month) impede duplicação de períodos.

Filtros aceitam meses sem relatório e exibem estado vazio. A série anual mantém
ausências como null; comparação usa o mês calendário anterior, inclusive na
virada de ano, e não calcula percentual sobre base zero ou ausente.

Validação: `node --test tests/*.test.mjs` e `npm run build`. Na importação inicial
foram conferidos oito relatórios e testadas leitura do proprietário, ausência
de resultados para usuário comum e falta de privilégios de leitura anônima
ou escrita pelo cliente.
