import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(code)).toString('base64');
const parserUrl = moduleUrl(source('src/lib/seller-margin-report.ts'));
const { validateSellerMarginTotal, parseSellerMarginPdf } = await import(parserUrl);
const webUrl = moduleUrl(source('src/lib/web-sales.server.ts'));
const statsUrl = moduleUrl(source('src/lib/admin-sales-statistics.server.ts')
  .replace('@/lib/web-sales.server', webUrl)
  .replace('await import("@/lib/seller-quotes.server")', '{ listQuotes: async () => [] }'));
const { buildAdminSalesStatistics } = await import(statsUrl);
const amounts = [81194, 365349.52, 112242.41, 96169.77, 66340.51, 43797.14, 16505.03, 1211.91, 7800, 10372.81, 6394.32];
const rows = amounts.map((value, index) => ({
  id: String(index).padStart(3, '0'), report_year: 2026, report_month: 1,
  report_seller_code: String(index + 1), report_seller_name: `Vendedor ${index + 1}`,
  seller_user_id: index < 7 ? `fixture-user-${index}` : null,
  total_venda: value, period_start: '2026-01-01', period_end: '2026-01-31',
  updated_at: '2026-10-06T16:35:07.873Z',
}));
function db(monthly = rows, snapshots = rows, cap = 1000) {
  return { from(table) {
    const records = table === 'seller_monthly_margin_reports' ? monthly : table === 'seller_margin_report_snapshots' ? snapshots : [];
    return {
      select() { return this; }, order() { return this; }, or() { return this; },
      range(from, to) { return Promise.resolve({ data: records.slice(from, Math.min(to + 1, from + cap)), error: null }); },
    };
  } };
}
const request = new Request('https://dukamp.test/api/admin/seller-margin-reports?view=statistics&from=2026-01-01&to=2026-01-31&preset=month');
test('January consolidated revenue includes all eleven rows, including four unlinked sellers', async () => {
  const result = await buildAdminSalesStatistics(db(), request);
  assert.equal(Math.round(result.summary.total_venda * 100), 80737742);
  assert.equal(Math.round(result.annualSeries[0].total_venda * 100), 80737742);
  assert.equal(Math.round(rows.filter(row => row.seller_user_id).reduce((sum, row) => sum + row.total_venda, 0) * 100), 78159838);
});
test('API page caps cannot omit the last four sellers or cap the historical revenue', async () => {
  const result = await buildAdminSalesStatistics(db(rows, rows, 7), request);
  assert.equal(Math.round(result.summary.total_venda * 100), 80737742);
});
test('reimported monthly values override stale snapshots without double counting', async () => {
  const stale = rows.map(row => ({ ...row, total_venda: 0, updated_at: '2026-01-31T12:00:00Z' }));
  const result = await buildAdminSalesStatistics(db(rows, stale), request);
  assert.equal(Math.round(result.summary.total_venda * 100), 80737742);
  const newer = [{ ...rows[0], total_venda: 90000, updated_at: '2026-10-07T12:00:00Z' }];
  const refreshed = await buildAdminSalesStatistics(db(rows, newer), request);
  assert.equal(Math.round(refreshed.summary.total_venda * 100), 81618342);
});
test('server validates PDF total and rejects missing rows or unreadable total before writing', () => {
  const incoming = rows.map(row => ({ totalVenda: row.total_venda }));
  assert.equal(validateSellerMarginTotal(incoming, 807377.42), 807377.42);
  assert.throws(() => validateSellerMarginTotal(incoming.slice(0, 7), 807377.42), /não confere/);
  for (const total of [null, undefined, NaN, '807377.42']) assert.throws(() => validateSellerMarginTotal(incoming, total), /TOTAL/);
});
let writes = [];
const routeSource = source('src/routes/api/admin/seller-margin-reports.ts')
  .replace('import { createFileRoute } from "@tanstack/react-router";', 'const createFileRoute = () => value => value;')
  .replace('@/lib/seller-margin-report', parserUrl)
  .replaceAll('await import("@/lib/seller-system.server")', '{ authenticateRequest: async () => ({ supabaseAdmin: globalThis.__salesImportDb, user: { id: "fixture-admin" } }), errorResponse: () => {}, listAllAuthUsers: async () => [], resolveSellerIdentity: async () => null }');
const post = (await import(moduleUrl(routeSource))).Route.server.handlers.POST;
const fields = ['devolucao','aditivos','sacarias','balcao','totalCusto','margemPercentual','comissaoRepresentante','tonelagem','margemBruta','margemAditivos','margemAditivosPercentual','margemSacarias','margemSacariasPercentual','margemBalcao','margemBalcaoPercentual'];
const incoming = rows.map(row => ({ ...Object.fromEntries(fields.map(field => [field, 0])), code: row.report_seller_code, name: row.report_seller_name, totalVenda: row.total_venda }));
function importRequest(importRows = incoming, reportTotal = 807377.42) { return { request: new Request('https://dukamp.test/api/admin/seller-margin-reports', { method: 'POST', body: JSON.stringify({ fileName: 'fixture.pdf', periodStart: '2026-01-01', periodEnd: '2026-01-31', reportTotal, rows: importRows }) }) }; }
function setupImportDb() {
  writes = [];
  globalThis.__salesImportDb = { from(table) { return {
    select() { return this; }, eq() { return this; }, order() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: { id: 'fixture-admin' }, error: null }),
    then(resolve) { return Promise.resolve({ data: [], error: null }).then(resolve); },
    upsert: async records => { writes.push({ table, records }); return { error: null }; },
  }; } };
}
test('import endpoint persists unlinked rows in both histories and returns the full total', async () => {
  setupImportDb();
  const response = await post(importRequest());
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.totalVenda, 807377.42);
  assert.equal(result.totalRows, 11); assert.equal(result.unlinkedRows.length, 11);
  assert.equal(writes.length, 2);
  for (const write of writes) {
    assert.equal(write.records.length, 11);
    assert.equal(Math.round(write.records.reduce((sum, row) => sum + row.total_venda, 0) * 100), 80737742);
  }
});
test('mismatched PDF cannot update either report table', async () => {
  setupImportDb();
  assert.equal((await post(importRequest(incoming.slice(0, 7)))).status, 400);
  assert.deepEqual(writes, []);
});
test('PDF parser identifies January, all sellers and the declared total', async () => {
  const lines = ['RELATORIO MARGEM VENDA DE 01/01/26 ATE 31/01/26', 'COD VEND TOT_VENDA'];
  for (const row of incoming) lines.push(`${row.code} VENDEDOR ${row.totalVenda.toFixed(2)} ${Array(15).fill('0.00').join(' ')}`);
  lines.push('TOTAL 807377.42');
  const pdf = text => new Blob(['%PDF-1.4\n1 0 obj\n<< >>\nstream\n' + text.map(line => `(${line}) Tj`).join('\n') + '\nendstream\nendobj']);
  const parsed = await parseSellerMarginPdf(pdf(lines));
  assert.equal(parsed.periodStart, '2026-01-01'); assert.equal(parsed.periodEnd, '2026-01-31');
  assert.equal(parsed.rows.length, 11); assert.equal(parsed.reportTotal, 807377.42);
  assert.equal(validateSellerMarginTotal(parsed.rows, parsed.reportTotal), 807377.42);
  lines[lines.length - 1] = 'TOTAL ILEGIVEL';
  await assert.rejects(parseSellerMarginPdf(pdf(lines)), /TOTAL/);
});
test('daily cumulative baselines remain available after reimporting the monthly report', async () => {
  const baseline = { ...rows[0], id: 'baseline', report_seller_code: '001', total_venda: 10, period_end: '2026-01-15', updated_at: '2026-01-15T12:00:00Z' };
  const partial = new Request('https://dukamp.test/api/admin/seller-margin-reports?view=statistics&from=2026-01-16&to=2026-01-31&preset=custom');
  const result = await buildAdminSalesStatistics(db(rows, [baseline, ...rows]), partial);
  assert.equal(Math.round(result.summary.total_venda * 100), 80736742);
});
