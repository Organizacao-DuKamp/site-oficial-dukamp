import { auditRecord, isAuditUuid, type AuditRow } from "./audit-presentation";

const PREVIEW_KEYS = ["name","full_name","customer_name","cliente","title","titulo","descricao","code","codigo","order_number","key","status","delivery_status","refund_status","user_id","order_id"];
export const AUDIT_LIST_COLUMNS = "id,created_at,actor_id,actor_name,actor_email,actor_ip,action,entity_table,entity_id,changed_fields,source," +
  ["before","after"].flatMap(side => PREVIEW_KEYS.map(key => `${side}_${key}:${side}_data->>${key}`)).join(",");

// Only short descriptive fields are returned in the list. Full snapshots are
// fetched when opening a single event, so large ERP imports do not slow it down.
export async function enrichAuditRows(db: any, input: any[], detail = false): Promise<AuditRow[]> {
  const rows: AuditRow[] = input.map(raw => {
    if (detail) return { ...raw };
    const before: Record<string, unknown> = {}; const after: Record<string, unknown> = {};
    for (const key of PREVIEW_KEYS) {
      if (raw[`before_${key}`] !== null && raw[`before_${key}`] !== undefined) before[key] = raw[`before_${key}`];
      if (raw[`after_${key}`] !== null && raw[`after_${key}`] !== undefined) after[key] = raw[`after_${key}`];
    }
    return { id:raw.id,created_at:raw.created_at,actor_id:raw.actor_id,actor_name:raw.actor_name,actor_email:raw.actor_email,
      actor_ip:raw.actor_ip,action:raw.action,entity_table:raw.entity_table,entity_id:raw.entity_id,changed_fields:raw.changed_fields,
      before_data:before,after_data:after };
  });
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.actor_id) ids.add(row.actor_id);
    for (const data of [row.before_data,row.after_data]) for (const [key,value] of Object.entries(data || {})) {
      if ((key === "user_id" || key === "sender_id" || key.endsWith("_by")) && isAuditUuid(value)) ids.add(value);
    }
  }
  const people: Record<string,string> = {};
  if (ids.size) {
    const { data, error } = await db.from("profiles").select("id,full_name,email").in("id",[...ids]);
    if (error) console.error("[audit] Não foi possível carregar os nomes vinculados",error);
    for (const person of data || []) if (person.full_name || person.email) people[person.id] = person.full_name || person.email;
  }
  if (detail) {
    const links = [
      { field:"product_id",table:"products",label:"name" },
      { field:"order_id",table:"orders",label:"order_number" },
      { field:"category_id",table:"categories",label:"name" },
      { field:"catalog_id",table:"catalogs",label:"name" },
      { field:"seller_id",table:"sellers",label:"name" },
      { field:"customer_id",table:"customers",label:"cliente" },
    ];
    await Promise.all(links.map(async link => {
      const references = new Set<string>();
      for (const row of rows) for (const data of [row.before_data,row.after_data]) {
        const id = data?.[link.field]; if (isAuditUuid(id)) references.add(id);
      }
      if (!references.size) return;
      const { data, error } = await db.from(link.table).select(`id,${link.label}`).in("id",[...references]);
      if (error) { console.error("[audit] Nome do cadastro vinculado indisponível",error);return; }
      for (const item of data || []) if (item[link.label]) people[`${link.field}:${item.id}`] = link.field === "order_id" ? `Pedido ${item[link.label]}` : item[link.label];
    }));
  }
  return rows.map(row => {
    const enriched = { ...row, people };
    return { ...enriched, record_label:auditRecord(enriched) };
  });
}
