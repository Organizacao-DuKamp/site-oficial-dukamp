import { useState } from "react";
import { auditLabel, auditValue } from "@/lib/audit-presentation";

export function AuditValue({ field, value, people }: { field:string;value:unknown;people:Record<string,string> }) {
  const [expanded,setExpanded] = useState(false);
  const [limit,setLimit] = useState(20);
  if (value === null || typeof value !== "object") {
    const text = auditValue(field,value,people);
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return <a className="text-primary underline break-all" href={value} target="_blank" rel="noopener noreferrer">{field.includes("image") ? "Ver imagem" : "Abrir link / arquivo"}</a>;
    return <span className={`whitespace-pre-wrap break-words ${text === "Não informado" ? "text-muted-foreground italic" : ""}`}>{text}</span>;
  }
  const entries = Array.isArray(value) ? value.map((item,index) => [String(index),item] as const)
    : Object.entries(value).filter(([key]) => key !== "id" && !/(password|senha|token|secret|api_key|qr_code)/i.test(key));
  if (!entries.length) return <span className="text-muted-foreground">Nenhuma informação cadastrada</span>;
  return <div className="space-y-2 min-w-0">
    <button type="button" aria-expanded={expanded} className="text-primary underline text-left" onClick={() => setExpanded(!expanded)}>{expanded ? "Ocultar" : "Ver"} {entries.length} {Array.isArray(value) ? "itens" : "informações"}</button>
    {expanded && <div className="space-y-3 border-l-2 pl-3">
      {entries.slice(0,limit).map(([key,item]) => <div key={key} className="space-y-1"><p className="font-medium text-xs text-muted-foreground">{auditLabel(key)}</p><AuditValue field={Array.isArray(value) ? field : key} value={item} people={people} /></div>)}
      {entries.length > limit && <button type="button" className="text-primary underline text-sm" onClick={() => setLimit(limit+20)}>Mostrar mais 20 itens</button>}
    </div>}
  </div>;
}
