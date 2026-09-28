import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../src/lib/erp-margin.ts", import.meta.url), "utf8");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`;
const { aggregateSeller, weekdays, marginPercent } = await import(moduleUrl);
const report = (month, end, venda, cost, gross) => ({
  report_year: 2026, report_month: month, report_seller_code: "13", report_seller_name: "ILDEN",
  period_start: `2026-${String(month).padStart(2, "0")}-01`, period_end: end,
  updated_at: `${end}T12:00:00Z`, total_venda: venda, total_custo: cost, margem_bruta: gross,
});

test("uses the latest cumulative snapshot once, then subtracts the prior baseline", () => {
  const rows = [report(9, "2026-09-10", 100, 70, 30), report(9, "2026-09-28", 320, 220, 100)];
  assert.equal(aggregateSeller(rows, "2026-09-01", "2026-09-28").totals.total_venda, 320);
  const partial = aggregateSeller(rows, "2026-09-11", "2026-09-28");
  assert.equal(partial.totals.total_venda, 220);
  assert.equal(partial.totals.margem_bruta, 70);
  assert.equal(marginPercent(partial.totals), 70 / 220 * 100);
});

test("flags missing baseline rather than showing an inaccurate partial amount", () => {
  const partial = aggregateSeller([report(9, "2026-09-28", 320, 220, 100)], "2026-09-11", "2026-09-28");
  assert.deepEqual(partial.missingBaseline, ["2026-09"]);
  assert.equal(partial.totals.total_venda, 0);
});

test("adds separate months and counts weekdays without assuming holidays", () => {
  const totals = aggregateSeller([report(8, "2026-08-31", 100, 70, 30), report(9, "2026-09-28", 320, 220, 100)], "2026-08-01", "2026-09-28");
  assert.equal(totals.totals.total_venda, 420);
  assert.equal(weekdays("2026-09-26", "2026-09-28"), 1);
});
