import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { LoaderCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ProductSearch({ className = "" }: { className?: string }) {
  const navigate = useNavigate();
  const { urlTerm, pathname } = useRouterState({ select: ({ location }) => ({
    urlTerm: String((location.search as { q?: string }).q || ""),
    pathname: location.pathname,
  }) });
  const [term, setTerm] = useState(urlTerm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef(0);
  const editing = useRef(false);
  useEffect(() => {
    if (!editing.current) setTerm(urlTerm);
  }, [urlTerm]);
  useEffect(() => () => {
    clearTimeout(timer.current);
    request.current++;
  }, []);

  async function search(value: string, version: number) {
    setBusy(true);
    setError("");
    try {
      await navigate({ to: "/produtos", search: { q: value || undefined, page: 1 } });
    } catch {
      if (version === request.current) setError("Não foi possível buscar. Tente novamente.");
    } finally {
      if (version === request.current) {
        editing.current = false;
        setBusy(false);
      }
    }
  }
  function change(value: string) {
    setTerm(value);
    editing.current = true;
    setError("");
    clearTimeout(timer.current);
    const version = ++request.current;
    const query = value.trim();
    if (query.length >= 2 || (!query && urlTerm && pathname.startsWith("/produtos"))) {
      setBusy(true);
      timer.current = setTimeout(() => void search(query, version), 350);
    } else {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    clearTimeout(timer.current);
    if (!term.trim() && !urlTerm) return;
    void search(term.trim(), ++request.current);
  }
  return (
    <form role="search" aria-label="Pesquisar produtos" aria-busy={busy} onSubmit={submit} className={`relative gap-2 ${className}`}>
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" aria-label="Buscar produtos" autoComplete="off" value={term} onChange={(e) => change(e.target.value)} placeholder="Buscar produtos..." className="pl-9" />
      </div>
      <Button type="submit" size="sm" className="h-9 shrink-0" aria-label={busy ? "Buscar produtos — carregando" : "Buscar produtos agora"}>
        {busy && <LoaderCircle aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" />}
        {busy ? "Buscando..." : "Buscar"}
      </Button>
      <span role={error ? "alert" : "status"} aria-live="polite" className={error ? "absolute left-0 top-full mt-1 rounded border bg-card p-2 text-xs text-destructive shadow" : "sr-only"}>
        {error || (busy ? "Buscando produtos. Aguarde os resultados." : "")}
      </span>
    </form>
  );
}
