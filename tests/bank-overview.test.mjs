import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(readFileSync(new URL('../src/lib/bank-overview.ts', import.meta.url), 'utf8'));
const { bankOverviewAmounts } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('importing a different expense report cannot change bank expenses or bank result', () => {
  const report = { year: 2026, month: 5, payload: { bank_totals: { credits: 20000 }, bank_expense_total: 12000, total: 15000 } };
  const before = bankOverviewAmounts(report);
  assert.deepEqual(before, { credits: 20000, expenses: 12000, result: 8000 });
  report.payload.total = 18500;
  assert.deepEqual(bankOverviewAmounts(report), before);
});

test('a month with only an expense report has no bank summary fallback', () => {
  assert.deepEqual(bankOverviewAmounts({ year: 2025, month: 4, payload: { total: 15000 } }), { credits: null, expenses: null, result: null });
  assert.deepEqual(bankOverviewAmounts(undefined), { credits: null, expenses: null, result: null });
});

test('zero bank expenses and negative bank results remain valid amounts', () => {
  assert.deepEqual(bankOverviewAmounts({ payload: { bank_totals: { credits: 0 }, bank_expense_total: 0 } }), { credits: 0, expenses: 0, result: 0 });
  assert.equal(bankOverviewAmounts({ payload: { bank_totals: { credits: 500 }, bank_expense_total: 800 } }).result, -300);
});

test('statement credits and debits feed the upper cards without replacing expense or bank records', () => {
  const report = { payload: { bank_credits_total: 25000, bank_expense_total: 18000, total: 30000, bank_totals: { credits: 20000 } } };
  assert.deepEqual(bankOverviewAmounts(report), { credits: 25000, expenses: 18000, result: 7000 });
  assert.equal(report.payload.total, 30000);
  assert.equal(report.payload.bank_totals.credits, 20000);
  assert.equal(bankOverviewAmounts({ payload: { bank_credits_total: 0, bank_expense_total: 100, bank_totals: { credits: 20000 } } }).result, -100);
});
