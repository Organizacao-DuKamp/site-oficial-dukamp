import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const code = stripTypeScriptTypes(readFileSync(new URL('../src/lib/net-profit.ts', import.meta.url), 'utf8'));
const { netProfit } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
test('net profit subtracts expenses and preserves positive, zero and negative values', () => {
  assert.equal(netProfit(1000, 700), 300);
  assert.equal(netProfit(1000, 1000), 0);
  assert.equal(netProfit(1000, 1200), -200);
  assert.equal(netProfit(0.3, 0.2), 0.1);
  assert.equal(netProfit(0.1 + 0.2, 0.3), 0);
});
test('unavailable or invalid amounts never produce a fabricated profit', () => {
  assert.equal(netProfit(1000, null), null);
  assert.equal(netProfit(undefined, 700), null);
  assert.equal(netProfit(NaN, 700), null);
  assert.equal(netProfit(1000, Infinity), null);
});
