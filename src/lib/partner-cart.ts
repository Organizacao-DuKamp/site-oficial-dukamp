import type { PartnerCartItem } from "./partners";

function lineIdentity(item: PartnerCartItem): string {
  const choices = [...(item.selected_options || [])].sort((a, b) =>
    a.option_id.localeCompare(b.option_id) || a.value_id.localeCompare(b.value_id),
  );
  return JSON.stringify([item.product_id, choices.map(({ option_id, value_id }) => [option_id, value_id])]);
}

// Keep each variant separate while preserving the first row's UI key.
export function mergePartnerCartLines<T extends PartnerCartItem>(lines: T[]): T[] {
  const result: T[] = [];
  const indexes = new Map<string, number>();
  for (const line of lines) {
    const identity = lineIdentity(line);
    const index = indexes.get(identity);
    if (index === undefined) {
      indexes.set(identity, result.length);
      result.push({ ...line });
    } else {
      result[index] = { ...result[index], quantity: result[index].quantity + line.quantity };
    }
  }
  return result;
}
