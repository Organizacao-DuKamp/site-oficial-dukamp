import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../src/lib/bank-reports.ts', import.meta.url),'utf8');
const { previousBankPeriod, bankComparison, bankAnnualSeries } = await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
test('January compares with December of the preceding year', () => {
  assert.deepEqual(previousBankPeriod(2026,1),{year:2025,month:12});
  assert.deepEqual(previousBankPeriod(2026,8),{year:2026,month:7});
});
test('missing and zero previous values are not fabricated', () => {
  assert.equal(bankComparison(100,null),null);
  assert.deepEqual(bankComparison(100,0),{difference:100,percent:null});
});
test('comparison retains negative changes', () => {
  assert.deepEqual(bankComparison(80,100),{difference:-20,percent:-20});
});
test('annual series excludes other years and leaves missing months null', () => {
  const reports=[{year:2026,month:1,payload:{total:12200,original:12000}},{year:2025,month:2,payload:{total:99999,original:99999}}];
  const series=bankAnnualSeries(reports,2026);
  assert.equal(series.length,12);
  assert.equal(series[0].total,122);
  assert.equal(series[1].total,null);
  assert.equal(series[11].original,null);
});
