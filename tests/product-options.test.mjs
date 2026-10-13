import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const source = readFileSync(
  new URL("../src/lib/product-options.ts", import.meta.url),
  "utf8",
).replace('"zod"', JSON.stringify(import.meta.resolve("zod")));
const options = await import(
  "data:text/javascript;base64," + Buffer.from(stripTypeScriptTypes(source)).toString("base64")
);
const {
  productOptionsSchema,
  resolveOptionSelections,
  choicesForSelections,
  selectionSummary,
  cartItemKey,
  productQuantities,
} = options;
const color = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Cor do produto",
  values: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      label: "Preta",
      image: "https://example.com/preta.webp",
    },
    { id: "33333333-3333-4333-8333-333333333333", label: "Branca" },
  ],
};
const size = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Tamanho",
  values: [{ id: "55555555-5555-4555-8555-555555555555", label: "M" }],
};
const choice = (group = color, value = color.values[0]) => ({
  option_id: group.id,
  value_id: value.id,
});

test("existing products without options still accept empty selections", () => {
  assert.deepEqual(resolveOptionSelections(undefined, []), []);
  assert.equal(cartItemKey({ id: "product" }), "product");
});

test("photos are optional; texts are trimmed and duplicate alternatives rejected", () => {
  const parsed = productOptionsSchema.parse([
    { ...color, name: " Cor do produto ", values: [{ ...color.values[1], label: " Branca " }] },
  ]);
  assert.equal(parsed[0].name, "Cor do produto");
  assert.equal(parsed[0].values[0].label, "Branca");
  assert.equal(parsed[0].values[0].image, undefined);
  assert.equal(
    productOptionsSchema.safeParse([
      { ...color, values: [{ ...color.values[0], image: "javascript:alert(1)" }] },
    ]).success,
    false,
  );
  assert.equal(productOptionsSchema.safeParse([{ ...color, values: [] }]).success, false);
  assert.equal(productOptionsSchema.safeParse([{ ...color, name: " " }]).success, false);
  assert.equal(
    productOptionsSchema.safeParse([
      { ...color, values: [color.values[0], { ...color.values[1], label: " PRETA " }] },
    ]).success,
    false,
  );
  assert.equal(
    productOptionsSchema.safeParse([color, { ...size, name: "cor do produto" }]).success,
    false,
  );
});

test("the server resolves trusted labels and images, ignoring forged client text", () => {
  const snapshot = resolveOptionSelections(
    [color],
    [{ ...choice(), label: "Vermelha", image: "https://example.com/forged" }],
  );
  assert.equal(snapshot[0].label, "Preta");
  assert.equal(snapshot[0].image, color.values[0].image);
  assert.equal(selectionSummary(snapshot), "Cor do produto: Preta");
  assert.deepEqual(choicesForSelections(snapshot), [choice()]);
});

test("every group is required and unknown, deleted or duplicate choices are rejected", () => {
  assert.throws(() => resolveOptionSelections([color], []));
  assert.throws(() => resolveOptionSelections([], [choice()]));
  assert.throws(() => resolveOptionSelections([color], [choice(color, size.values[0])]));
  assert.throws(() => resolveOptionSelections([color, size], [choice(), choice()]));
  assert.throws(() => resolveOptionSelections([color, size], [choice()]));
  assert.equal(
    resolveOptionSelections([color, size], [choice(size, size.values[0]), choice()]).length,
    2,
  );
});

test("cart lines distinguish alternatives but merge the same choices regardless of order", () => {
  const black = resolveOptionSelections([color], [choice()]);
  const white = resolveOptionSelections([color], [choice(color, color.values[1])]);
  assert.notEqual(
    cartItemKey({ id: "product", selectedOptions: black }),
    cartItemKey({ id: "product", selectedOptions: white }),
  );
  const selected = resolveOptionSelections([color, size], [choice(), choice(size, size.values[0])]);
  assert.equal(
    cartItemKey({ id: "product", selectedOptions: selected }),
    cartItemKey({ id: "product", selectedOptions: selected.toReversed() }),
  );
  assert.equal(
    cartItemKey({ id: "product", selectedOptions: black }),
    cartItemKey({ id: "product", selectedOptions: [{ ...black[0], label: "Nome atualizado" }] }),
  );
});

test("order snapshots retain the selected name after the product is edited", () => {
  const editable = structuredClone(color);
  const snapshot = resolveOptionSelections([editable], [choice()]);
  editable.name = "Nova opção";
  editable.values[0].label = "Outro nome";
  editable.values = [];
  assert.equal(selectionSummary(snapshot), "Cor do produto: Preta");
});

test("stock checks add quantities across color and size combinations", () => {
  const totals = productQuantities([
    { product_id: "a", quantity: 2 },
    { product_id: "a", quantity: 3 },
    { product_id: "b", quantity: 1 },
  ]);
  assert.equal(totals.get("a"), 5);
  assert.equal(totals.get("b"), 1);
});
