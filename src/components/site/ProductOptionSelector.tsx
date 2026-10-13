import type { ProductOption } from "@/lib/product-options";

export function ProductOptionSelector({
  options,
  selected,
  onSelect,
}: {
  options: ProductOption[];
  selected: Record<string, string>;
  onSelect: (optionId: string, valueId: string) => void;
}) {
  return (
    <div className="mt-6 space-y-4">
      {options.map((option) => (
        <fieldset key={option.id}>
          <legend className="mb-2 text-sm font-semibold">
            {option.name}{" "}
            <span className="font-normal text-muted-foreground">— escolha uma opção</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => (
              <label
                key={value.id}
                className={`relative flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring ${selected[option.id] === value.id ? "border-primary bg-primary/5 font-semibold" : "border-border hover:border-primary/50"}`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  name={`product-option-${option.id}`}
                  value={value.id}
                  checked={selected[option.id] === value.id}
                  onChange={() => onSelect(option.id, value.id)}
                />
                {value.image && (
                  <img
                    src={value.image}
                    alt={value.label}
                    className="h-12 w-12 rounded-md bg-white object-contain"
                  />
                )}
                <span>{value.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
