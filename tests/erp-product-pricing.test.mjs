import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(new URL("../src/lib/erp-product-pricing.ts", import.meta.url), "utf8");
const moduleUrl = "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64");
const { updateMarginBand, updatePricingField, pricingError } = await import(moduleUrl);

// EFAPRODU/EFATABPR, product 017981 (SAL COMUM MOIDO), as recorded in COMPRAS.
const product = {
  custo_real: "0.220", frete: "0.4500", carga_descarga: "0.000",
  custo_final: "0.670", custo_ajustado: "0.67", percentual_ajuste: "0.00",
  financiamento_mensal: "2.50",
  percentual_margens: [
    { numero: 1, margem_configurada: "18.00", margem_bruta: "23.88", comissao_interna: "2.70" },
    { numero: 2, margem_configurada: "17.10", margem_bruta: "22.38", comissao_interna: "2.57" },
    { numero: 3, margem_configurada: "16.20", margem_bruta: "20.89", comissao_interna: "2.43" },
    { numero: 4, margem_configurada: "15.30", margem_bruta: "19.40", comissao_interna: "1.70" },
  ],
  faixas: [
    { prazo_dias: 0,
      tabela: { preco: "0.83", comissao_percentual: "2.70" },
      produtor: { preco: "0.82", comissao_percentual: "2.57" },
      revenda: { preco: "0.81", comissao_percentual: "2.43" },
      tabela_endereco: { preco: "0.80", comissao_percentual: "1.70" } },
    { prazo_dias: 28,
      tabela: { preco: "0.85", comissao_percentual: "2.62" },
      produtor: { preco: "0.84", comissao_percentual: "2.49" },
      revenda: { preco: "0.83", comissao_percentual: "2.36" },
      tabela_endereco: { preco: "0.82", comissao_percentual: "1.65" } },
    { prazo_dias: 56,
      tabela: { preco: "0.88", comissao_percentual: "2.54" },
      produtor: { preco: "0.87", comissao_percentual: "2.42" },
      revenda: { preco: "0.85", comissao_percentual: "2.29" },
      tabela_endereco: { preco: "0.84", comissao_percentual: "1.60" } },
  ],
};

test("the six source concepts stay distinct and untouched before editing", () => {
  assert.equal(pricingError(product), null);
  assert.equal(product.percentual_margens[0].margem_configurada, "18.00");
  assert.equal(product.percentual_margens[0].margem_bruta, "23.88");
  assert.equal(product.faixas[0].tabela.preco, "0.83");
  assert.equal(updatePricingField(product, "descricao_ajuste", "teste").faixas, product.faixas);
});

test("changing the first margin updates the other table margins and gross margins", () => {
  const changed = updateMarginBand(product, 0, "margem_configurada", "20");
  assert.deepEqual(changed.percentual_margens.slice(0, 4).map((band) => band.margem_configurada),
    ["20", "19.00", "18.00", "17.00"]);
  assert.equal(changed.percentual_margens[0].comissao_interna, "3.00");
  assert.ok(Number(changed.faixas[0].tabela.preco) > 0.83);
  assert.equal(changed.percentual_margens[0].margem_bruta,
    ((Number(changed.faixas[0].tabela.preco) / 0.67 - 1) * 100).toFixed(2));
  assert.equal(product.percentual_margens[0].margem_configurada, "18.00");
  assert.equal(product.faixas[0].tabela.preco, "0.83");
});

test("editing revenda leaves the other prices unchanged", () => {
  const changed = updateMarginBand(product, 2, "margem_configurada", "18");
  assert.equal(changed.faixas[0].tabela.preco, "0.83");
  assert.equal(changed.faixas[0].produtor.preco, "0.82");
  assert.ok(Number(changed.faixas[0].revenda.preco) > 0.81);
});

test("cost and financing recalculate their linked prices", () => {
  const cost = updatePricingField(product, "custo_real", "0.30");
  assert.equal(cost.custo_final, "0.750");
  assert.equal(cost.custo_ajustado, "0.75");
  assert.ok(Number(cost.faixas[0].tabela.preco) > 0.83);

  const financed = updatePricingField(product, "financiamento_mensal", "5.00");
  assert.equal(financed.faixas[0].tabela.preco, "0.83");
  assert.ok(Number(financed.faixas[2].tabela.preco) > 0.88);
});
