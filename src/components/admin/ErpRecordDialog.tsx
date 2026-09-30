import type { ReactNode } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ErpRecordView = "visualizar" | "editar" | "excluir";

type Props = {
  open: boolean;
  title: string;
  view: ErpRecordView;
  onViewChange: (view: ErpRecordView) => void;
  onClose: () => void;
  details: ReactNode;
  editForm: ReactNode;
  deleteLabel: string;
  deleteDescription: string;
  onDelete: () => void;
  deleting?: boolean;
  disableDelete?: boolean;
};

export function ErpRecordDialog({
  open,
  title,
  view,
  onViewChange,
  onClose,
  details,
  editForm,
  deleteLabel,
  deleteDescription,
  onDelete,
  deleting = false,
  disableDelete = false,
}: Props) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12 text-left">
          <DialogTitle className="break-words leading-snug">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualize, edite ou exclua este registro. Use Fechar para voltar à lista.
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex shrink-0 flex-wrap gap-2 border-b px-4 py-3 sm:px-5"
          role="group"
          aria-label="Ações do registro"
        >
          <Button
            type="button"
            size="sm"
            variant={view === "visualizar" ? "default" : "outline"}
            aria-pressed={view === "visualizar"}
            onClick={() => onViewChange("visualizar")}
          >
            <Eye className="mr-2 h-4 w-4" aria-hidden="true" /> Visualizar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "editar" ? "default" : "outline"}
            aria-pressed={view === "editar"}
            onClick={() => onViewChange("editar")}
          >
            <Pencil className="mr-2 h-4 w-4" aria-hidden="true" /> Editar
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === "excluir" ? "destructive" : "outline"}
            aria-pressed={view === "excluir"}
            disabled={disableDelete}
            onClick={() => onViewChange("excluir")}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" /> Excluir
          </Button>
          <Button type="button" size="sm" variant="ghost" className="sm:ml-auto" onClick={onClose}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" /> Fechar
          </Button>
        </div>

        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          {view === "visualizar" && details}
          {view === "editar" && editForm}
          {view === "excluir" && (
            <div className="space-y-4 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm">{deleteDescription}</p>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || disableDelete}
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                {deleting ? "Excluindo..." : deleteLabel}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
