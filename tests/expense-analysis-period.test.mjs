import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(readFileSync(new URL('../src/lib/expense-analysis-period.ts', import.meta.url), 'utf8'));
const { expenseAnalysisRange } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const selection = { mode: 'month', year: 2025, from: '', to: '' };
test('monthly selection crosses the year boundary and handles leap February', () => {
  assert.deepEqual(expenseAnalysisRange(selection, 202501).previousPeriods, [202412]);
  assert.equal(expenseAnalysisRange(selection, 202402).to, '2024-02-29');
});
test('annual selection contains all twelve months and compares the prior year', () => {
  const result = expenseAnalysisRange({ ...selection, mode: 'year' }, 202609);
  assert.equal(result.periods.length, 12);
  assert.equal(result.periods[0], 202501);
  assert.equal(result.periods.at(-1), 202512);
  assert.equal(result.previousPeriods[0], 202401);
  assert.equal(result.previousPeriods.at(-1), 202412);
});
test('custom dates include their full months once, including across years', () => {
  const result = expenseAnalysisRange({ ...selection, mode: 'custom', from: '2025-12-15', to: '2026-02-02' }, 202609);
  assert.deepEqual(result.periods, [202512, 202601, 202602]);
  assert.deepEqual(result.previousPeriods, [202509, 202510, 202511]);
});
test('invalid, blank, and reversed dates do not silently fall back to the current month', () => {
  for (const [from, to] of [['', '2025-01-31'], ['2025-02-30', '2025-03-31'], ['2025-12-01', '2025-01-01'], ['2025-99-01', '2025-99-31']]) {
    assert.equal(expenseAnalysisRange({ ...selection, mode: 'custom', from, to }, 202609), null);
  }
});
