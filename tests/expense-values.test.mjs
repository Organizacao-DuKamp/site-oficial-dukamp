import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(readFileSync(new URL('../src/lib/expense-values.ts', import.meta.url), 'utf8'));
const { loadAllExpenseValues } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));

test('expense totals include every period beyond the API cap, even with a smaller server cap', async () => {
  const records = Array.from({ length: 1325 }, (_, i) => ({ year: 2025 + Math.floor(i / 700), month: i % 12 + 1, subcategory_code: i, amount: i + 0.25 }));
  for (const cap of [1000, 250]) {
    const orders = [];
    const db = { from() { return {
      select() { return this; },
      order(column) { orders.push(column); return this; },
      async range(from, to) { return { data: records.slice(from, Math.min(to + 1, from + cap)), error: null }; },
    }; } };
    const result = await loadAllExpenseValues(db);
    assert.deepEqual(result.data, records);
    assert.deepEqual(orders.slice(0, 3), ['year', 'month', 'subcategory_code']);
  }
});

test('a failed later page rejects the load instead of returning incomplete totals', async () => {
  const error = new Error('page unavailable');
  const db = { from() { return {
    select() { return this; }, order() { return this; },
    async range(from) { return from ? { data: null, error } : { data: [{ amount: 100 }], error: null }; },
  }; } };
  await assert.rejects(loadAllExpenseValues(db), error);
});
