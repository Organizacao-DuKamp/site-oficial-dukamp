import { z } from "zod";

const imageSchema = z
  .string()
  .trim()
  .max(4096)
  .refine(
    (value) => !value || /^https?:\/\//i.test(value) || /^\/(?!\/)/.test(value),
    "A foto precisa ter uma URL válida.",
  )
  .optional();
const textSchema = z
  .string()
  .trim()
  .min(1, "Preencha o nome da opção e o texto de todas as alternativas.")
  .max(120, "Use no máximo 120 caracteres.");
const valueSchema = z.object({ id: z.string().uuid(), label: textSchema, image: imageSchema });
const optionSchema = z.object({
  id: z.string().uuid(),
  name: textSchema,
  values: z.array(valueSchema).min(1, "Adicione pelo menos uma alternativa por opção.").max(100),
});

export const productOptionsSchema = z
  .array(optionSchema)
  .max(20)
  .superRefine((options, ctx) => {
    const names = new Set<string>();
    const ids = new Set<string>();
    for (const option of options) {
      const name = option.name.toLocaleLowerCase("pt-BR");
      if (names.has(name) || ids.has(option.id))
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cada opção precisa ter um nome diferente.",
        });
      names.add(name);
      ids.add(option.id);
      const labels = new Set<string>();
      const valueIds = new Set<string>();
      for (const value of option.values) {
        const label = value.label.toLocaleLowerCase("pt-BR");
        if (labels.has(label) || valueIds.has(value.id))
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `As alternativas de ${option.name} precisam ser diferentes.`,
          });
        labels.add(label);
        valueIds.add(value.id);
      }
    }
  });

export type ProductOption = z.infer<typeof optionSchema>;
export type OptionChoice = { option_id: string; value_id: string };
export type SelectedOption = {
  optionId: string;
  optionName: string;
  valueId: string;
  label: string;
  image?: string;
};

export const optionChoicesSchema = z
  .array(
    z.object({
      option_id: z.string().uuid(),
      value_id: z.string().uuid(),
    }),
  )
  .max(20)
  .default([]);

export function readProductOptions(value: unknown): ProductOption[] {
  const parsed = productOptionsSchema.safeParse(value ?? []);
  return parsed.success ? parsed.data : [];
}

// Resolve labels and photos from the current catalog, never from client-provided text.
export function resolveOptionSelections(value: unknown, choices: OptionChoice[]): SelectedOption[] {
  const options = productOptionsSchema.parse(value ?? []);
  if (
    choices.length !== options.length ||
    new Set(choices.map((choice) => choice.option_id)).size !== choices.length
  ) {
    throw new Error("Escolha uma alternativa para cada opção do produto.");
  }
  return options.map((option) => {
    const choice = choices.find((item) => item.option_id === option.id);
    const selected = option.values.find((item) => item.id === choice?.value_id);
    if (!selected) throw new Error(`Escolha uma alternativa válida para ${option.name}.`);
    return {
      optionId: option.id,
      optionName: option.name,
      valueId: selected.id,
      label: selected.label,
      ...(selected.image ? { image: selected.image } : {}),
    };
  });
}

export function choicesForSelections(selections: SelectedOption[] = []): OptionChoice[] {
  return selections.map((selection) => ({
    option_id: selection.optionId,
    value_id: selection.valueId,
  }));
}

export function selectionSummary(selections: SelectedOption[] = []): string {
  return selections.map((selection) => `${selection.optionName}: ${selection.label}`).join(" · ");
}

export function cartItemKey(item: { id: string; selectedOptions?: SelectedOption[] }): string {
  const choices = choicesForSelections(item.selectedOptions).sort((a, b) =>
    a.option_id.localeCompare(b.option_id),
  );
  return choices.length ? `${item.id}:${JSON.stringify(choices)}` : item.id;
}

export function productQuantities(
  items: { product_id: string; quantity: number }[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items)
    totals.set(item.product_id, (totals.get(item.product_id) ?? 0) + item.quantity);
  return totals;
}
