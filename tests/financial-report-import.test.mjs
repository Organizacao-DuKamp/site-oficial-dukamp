import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const { parseFinancialReport } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(readFileSync(new URL('../src/lib/financial-report-import.ts', import.meta.url), 'utf8'))).toString('base64'));
const payable = `RESUMO FINANCEIRO POR GRUPO DESPESAS DE 01/04/25 A 30/04/25
 12 COMBUSTIVEL 100,10\f\0\0
 15 MANUTENCAO 20,20
      DESPESAS VEICULOS 120,30
 31 FAZENDA 20,00
 116 OUTRAS RECEITAS 5,00
      RECEITAS-> 5,00
      CHACARA 15,00
 >>> TOTAL GERAL . . . 135,30`;
test('payables validates subtotals across page boundaries and subtracts receipts only from their own code', () => {
 const [m] = parseFinancialReport(payable,'payables'); assert.equal(m.total,13530); assert.equal(m.values.find(v=>v.code===31).cents,2000); assert.equal(m.values.find(v=>v.code===116).cents,-500);
});
test('rejects incomplete months, mismatched totals, duplicate codes and wrong report type', () => {
 for (const report of [payable.replace('01/04/25','02/04/25'),payable.replace('135,30','135,31'),payable.replace('120,30','120,31'),payable.replace('15 MANUTENCAO','12 MANUTENCAO')]) assert.throws(()=>parseFinancialReport(report,'payables'));
 assert.throws(()=>parseFinancialReport(payable,'bank'));
});
const bank = `CONSULTA CONTA CORRENTE DE 01/01/26 ATE 28/02/26
 Cta Corrente: 123
 SALDO CONTA -> 999,00 C
 <<< 31/01/26 >>>
 AC DOC CLIENTE 80,00 C 01/02/26 S
 AD DOC TARIFA 10,00 D 31/01/26 S
 <<< 02/02/26 >>>
 AD DOC FORNECEDOR 30,00 D 02/02/26 S
 SALDO BANCO -> 1.000,00 C
 TOTAL DEBITOS -> 40,00
 TOTAL CREDITOS -> 80,00`;
test('bank uses posting date, excludes balances, aggregates every month and validates statement totals', () => {
 const m=parseFinancialReport(bank,'bank'); assert.equal(m.length,2);assert.equal(m[0].credits,8000);assert.equal(m[0].debits,1000);assert.equal(m[1].credits,0);assert.equal(m[1].debits,3000);
 assert.throws(()=>parseFinancialReport(bank.replace('40,00','41,00'),'bank'));
 assert.throws(()=>parseFinancialReport(bank.replace('31/01/26 >>>','31/12/25 >>>'),'bank'));
 assert.throws(()=>parseFinancialReport(bank+'\n Cta Corrente: 456','bank'));
});
