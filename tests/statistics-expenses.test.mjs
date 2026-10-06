import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(code)).toString('base64');
const source = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8');
const pagination = moduleUrl(source('src/lib/expense-values.ts'));
const { statisticsExpensesInRange, loadStatisticsExpenses } = await import(moduleUrl(source('src/lib/statistics-expenses.ts').replace('@/lib/expense-values', pagination)));
const categories = [{code:1,category_code:9010},{code:8,category_code:9010},{code:111,category_code:9010},{code:79,category_code:9011},{code:224,category_code:9011},{code:13,category_code:9001},{code:116,category_code:9021}];
const value = (code, amount, month = 9, year = 2026) => ({ year, month, subcategory_code:code, amount });

test('excludes all supplier fields and Não é despesa, retaining other expenses and negative receipts', () => {
  const data = {subcategories:categories,values:[value(1,500),value(8,100),value(111,20),value(79,30),value(224,50),value(13,40),value(116,-10)]};
  assert.deepEqual(statisticsExpensesInRange(data,'2026-09-01','2026-09-30'), {amount:80,availableMonths:1,expectedMonths:1,complete:true});
});

test('missing months differ from a reported zero and partial years sum only available reports', () => {
  const data = {subcategories:categories,values:[value(13,0,1),value(13,10.25,2)]};
  assert.equal(statisticsExpensesInRange(data,'2026-01-01','2026-01-31').amount,0);
  assert.equal(statisticsExpensesInRange(data,'2026-03-01','2026-03-31').amount,null);
  assert.deepEqual(statisticsExpensesInRange(data,'2026-01-01','2026-12-31'), {amount:10.25,availableMonths:2,expectedMonths:12,complete:false});
});

test('day/custom filters use full monthly reports without daily proration or duplication', () => {
  const data = {subcategories:categories,values:[value(13,10.10,12,2025),value(13,20.20,1,2026)]};
  assert.equal(statisticsExpensesInRange(data,'2025-12-15','2026-01-15').amount,30.30);
  assert.equal(statisticsExpensesInRange(data,'2026-01-20','2026-01-20').amount,20.20);
  assert.equal(statisticsExpensesInRange(data,'','2026-01-20').amount,null);
});

test('loader includes every expense page and uses fresh values after report changes', async () => {
  const values = Array.from({length:1205}, () => value(13,0.01));
  const db = {from(table) {return {select() {return this;},order() {return this;},
    then(resolve,reject) {return Promise.resolve({data:categories,error:null}).then(resolve,reject);},
    async range(from,to) {return {data:values.slice(from,Math.min(to+1,from+200)),error:null};},
  };}};
  assert.equal(statisticsExpensesInRange(await loadStatisticsExpenses(db),'2026-09-01','2026-09-30').amount,12.05);
  values[0].amount = 1.01;
  assert.equal(statisticsExpensesInRange(await loadStatisticsExpenses(db),'2026-09-01','2026-09-30').amount,13.05);
});
