import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useActiveSellers } from "@/lib/sellers";
import { getSellerLink } from "@/lib/seller-link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, UserRound } from "lucide-react";

export function SellerAttribution({ value, onChange, onReady }: {
  value: string | null | undefined; onChange: (value: string | null | undefined) => void; onReady: (value: boolean) => void;
}) {
  const { user, loading } = useAuth();
  const sellers = useActiveSellers();
  const [linked, setLinked] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    setChecking(true); setError(false); setLinked(null); onReady(false); onChange(undefined);
    const request = user ? getSellerLink() : Promise.resolve({ seller: null });
    request.then(result => {
      if (cancelled) return;
      setLinked(result.seller);
      if (result.seller) onChange(result.seller.id);
      onReady(true);
    }).catch(() => { if (!cancelled) setError(true); }).finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [user?.id, loading, attempt, onChange, onReady]);
  return <section className="rounded-xl border bg-card p-5 space-y-3" aria-labelledby="seller-attribution-title">
    <h2 id="seller-attribution-title" className="font-semibold">Qual vendedor ajudou você?</h2>
    {checking ? <p role="status" className="text-sm text-muted-foreground">Verificando seu vendedor…</p> : error ? <div><p className="text-sm text-destructive">Não conseguimos verificar o vínculo da sua conta.</p><Button variant="outline" onClick={() => setAttempt(x => x + 1)}>Tentar novamente</Button></div> : linked ? <p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5 text-green-600" /> Sua compra será registrada para <strong>{linked.name}</strong>, vendedor vinculado à sua conta.</p> : <>
      <p className="text-sm text-muted-foreground">Selecione quem atendeu você para dar o crédito desta compra. Se comprou por conta própria, escolha “Nenhum vendedor”.</p>
      {sellers.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando a equipe de vendas…</p>}
      {sellers.isError && <div className="text-sm text-destructive">Não foi possível carregar a equipe. <button className="underline" onClick={() => void sellers.refetch()}>Tentar novamente</button></div>}
      <div role="radiogroup" aria-label="Vendedor que ajudou nesta compra" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {(sellers.data ?? []).map(seller => <button key={seller.id} type="button" role="radio" aria-checked={value === seller.id} onClick={() => onChange(seller.id)} className={`flex flex-col items-center gap-2 rounded-lg border-2 p-3 text-center transition-colors ${value === seller.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-muted">{seller.photo_url ? <img src={seller.photo_url} alt="" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-muted-foreground" />}</div>
          <span className="text-sm font-medium">{seller.name}</span>{seller.region && <span className="text-xs text-muted-foreground">{seller.region}</span>}
        </button>)}
        <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 ${value === null ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}><UserRound className="h-9 w-9 text-muted-foreground" /><span className="text-sm font-medium">Nenhum vendedor</span><span className="text-xs text-muted-foreground">Comprei por conta própria</span></button>
      </div>
    </>}
  </section>;
}
