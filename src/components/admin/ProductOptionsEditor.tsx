import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "./ImageUpload";
import type { ProductOption } from "@/lib/product-options";

export function ProductOptionsEditor({
  value,
  onChange,
  onUploadingChange,
}: {
  value: ProductOption[];
  onChange: (value: ProductOption[]) => void;
  onUploadingChange: (busy: boolean) => void;
}) {
  const [uploads, setUploads] = useState<Record<string, boolean>>({});
  const busy = Object.values(uploads).some(Boolean);
  useEffect(() => {
    onUploadingChange(busy);
  }, [busy, onUploadingChange]);
  const update = (id: string, change: Partial<ProductOption>) =>
    onChange(value.map((option) => (option.id === id ? { ...option, ...change } : option)));
  const addValue = (option: ProductOption) =>
    update(option.id, { values: [...option.values, { id: crypto.randomUUID(), label: "" }] });

  return (
    <div className="mt-2 space-y-4 rounded-xl border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">
        Crie opções como cor, tamanho ou modelo. Cada alternativa pode ter uma foto.
      </p>
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Este produto ainda não tem opções.
        </p>
      )}
      {value.map((option, index) => (
        <section key={option.id} className="space-y-3 rounded-lg border bg-card p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor={`option-${option.id}`}>Nome da opção {index + 1}</Label>
              <Input
                id={`option-${option.id}`}
                placeholder="Ex.: Cor do produto"
                value={option.name}
                maxLength={120}
                required
                onChange={(event) => update(option.id, { name: event.target.value })}
              />
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={busy}
              aria-label={`Remover opção ${option.name || index + 1}`}
              onClick={() => onChange(value.filter((item) => item.id !== option.id))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="space-y-3">
            {option.values.map((alternative, alternativeIndex) => (
              <div key={alternative.id} className="rounded-lg border bg-muted/20 p-3">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Label htmlFor={`alternative-${alternative.id}`}>
                      Alternativa {alternativeIndex + 1}
                    </Label>
                    <Input
                      id={`alternative-${alternative.id}`}
                      placeholder="Ex.: Preta"
                      value={alternative.label}
                      maxLength={120}
                      required
                      onChange={(event) =>
                        update(option.id, {
                          values: option.values.map((item) =>
                            item.id === alternative.id
                              ? { ...item, label: event.target.value }
                              : item,
                          ),
                        })
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={busy}
                    aria-label={`Remover alternativa ${alternative.label || alternativeIndex + 1}`}
                    onClick={() =>
                      update(option.id, {
                        values: option.values.filter((item) => item.id !== alternative.id),
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Foto da alternativa (opcional)
                  </p>
                  <ImageUpload
                    value={alternative.image ?? ""}
                    folder="product-options"
                    pasteEnabled={false}
                    onBusyChange={(uploading) =>
                      setUploads((previous) => ({ ...previous, [alternative.id]: uploading }))
                    }
                    onChange={(image) =>
                      update(option.id, {
                        values: option.values.map((item) =>
                          item.id === alternative.id ? { ...item, image } : item,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || option.values.length >= 100}
            onClick={() => addValue(option)}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar alternativa
          </Button>
        </section>
      ))}
      <Button
        type="button"
        variant="outline"
        disabled={busy || value.length >= 20}
        onClick={() =>
          onChange([
            ...value,
            { id: crypto.randomUUID(), name: "", values: [{ id: crypto.randomUUID(), label: "" }] },
          ])
        }
      >
        <Plus className="mr-1 h-4 w-4" /> Adicionar opção
      </Button>
    </div>
  );
}
