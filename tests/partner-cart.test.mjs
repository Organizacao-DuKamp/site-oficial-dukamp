import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
const source = readFileSync(new URL('../src/lib/partner-cart.ts', import.meta.url), 'utf8');
const { mergePartnerCartLines } = await import('data:text/javascript;base64,' + Buffer.from(stripTypeScriptTypes(source)).toString('base64'));
const line = { key: 'first', product_id: 'feed', quantity: 1, selected_options: [] };

test('clicking the same product twice yields one row with two units and its original key', () => {
  const input = [line, { ...line, key: 'second' }];
  const result = mergePartnerCartLines(input);
  assert.deepEqual(result, [{ ...line, quantity: 2 }]);
  assert.equal(line.quantity, 1);
  assert.equal(input.length, 2);
});
test('existing quantities and repeated additions add up without merging different products', () => {
  assert.deepEqual(mergePartnerCartLines([{ ...line, quantity: 3 }, { ...line, key: 'second', quantity: 2 }, { ...line, key: 'other', product_id: 'mineral' }]), [{ ...line, quantity: 5 }, { ...line, key: 'other', product_id: 'mineral' }]);
});
test('variant identity ignores selection order and preserves different sizes as separate rows', () => {
  const color = { option_id: 'color', value_id: 'blue' }, size = { option_id: 'size', value_id: '36' };
  const first = { ...line, selected_options: [color, size] };
  const result = mergePartnerCartLines([first, { ...first, key: 'second', selected_options: [size, color] }, { ...first, key: 'third', selected_options: [color, { ...size, value_id: '38' }] }]);
  assert.equal(result.length, 2);
  assert.equal(result[0].quantity, 2);
  assert.equal(result[1].quantity, 1);
});
