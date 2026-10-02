// A seller choice is a business preference, never an authorization claim.
// Read the current account from Auth and validate the selected seller in DB.
export async function resolveOrderSeller(db: any, user: { user_metadata?: Record<string, any> } | null, choice: string | null | undefined) {
  const linkedId = user?.user_metadata?.selected_seller_id;
  if (typeof linkedId === "string" && /^[0-9a-f-]{36}$/i.test(linkedId)) {
    const { data, error } = await db.from("sellers").select("id,name,erp_seller_code,slug,active").eq("id", linkedId).eq("active", true).maybeSingle();
    if (error) throw new Error("Não foi possível verificar o vendedor da sua conta.");
    if (data) return data;
  }
  if (choice === undefined) throw new Error("Selecione quem ajudou você ou escolha Nenhum vendedor.");
  if (choice === null) return null;
  const { data, error } = await db.from("sellers").select("id,name,erp_seller_code,slug,active").eq("id", choice).eq("active", true).maybeSingle();
  if (error) throw new Error("Não foi possível validar o vendedor.");
  if (!data || data.slug.startsWith("conta-")) throw new Error("Escolha um vendedor ativo da equipe de vendas.");
  return data;
}
