import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/configuracoes")({
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => (await supabase.from("site_settings").select("*").eq("key", "general").maybeSingle()).data,
  });

  const [form, setForm] = useState<any>({});
  useEffect(() => { if (data?.value) setForm(data.value); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: "general", value: form }, { onConflict: "key" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings", "general"] }); toast.success("Configurações salvas"); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Configurações do Site</h1>
      <div className="space-y-4 rounded-lg border bg-card p-6">
        <div><Label>Nome do site</Label><Input value={form.site_name ?? ""} onChange={(e) => set("site_name", e.target.value)} /></div>
        <div><Label>Slogan</Label><Input value={form.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} /></div>
        <div><Label>E-mail</Label><Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} /></div>
        <div><Label>Telefone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} /></div>
        <div><Label>Endereço</Label><Textarea value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
      </div>
    </div>
  );
}
