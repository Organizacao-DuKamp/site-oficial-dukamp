import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Pilcrow, List, Undo2, Redo2 } from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
};

export function RichTextEditor({ value, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }

  const btn = "h-8 w-8 grid place-items-center rounded hover:bg-accent border";

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40">
        <button type="button" className={btn} title="Título" onClick={() => exec("formatBlock", "H2")}><Heading2 className="h-4 w-4" /></button>
        <button type="button" className={btn} title="Subtítulo" onClick={() => exec("formatBlock", "H3")}><Heading3 className="h-4 w-4" /></button>
        <button type="button" className={btn} title="Parágrafo" onClick={() => exec("formatBlock", "P")}><Pilcrow className="h-4 w-4" /></button>
        <button type="button" className={btn} title="Negrito" onClick={() => exec("bold")}><Bold className="h-4 w-4" /></button>
        <button type="button" className={btn} title="Lista" onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></button>
        <span className="w-px bg-border mx-1" />
        <button type="button" className={btn} title="Desfazer" onClick={() => exec("undo")}><Undo2 className="h-4 w-4" /></button>
        <button type="button" className={btn} title="Refazer" onClick={() => exec("redo")}><Redo2 className="h-4 w-4" /></button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
        className="prose-content min-h-[280px] p-4 outline-none text-sm"
      />
    </div>
  );
}
