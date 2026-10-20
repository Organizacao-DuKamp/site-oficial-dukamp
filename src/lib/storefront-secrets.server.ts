import { createCipheriv, createDecipheriv, randomBytes, hkdfSync, createHash } from "node:crypto";
function key() {
  const value = process.env.PARTNER_STORE_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Chave de proteção da conexão de pagamento indisponível.");
  return Buffer.from(hkdfSync("sha256", value, "dukamp-partner-stores", "mercadopago-v1", 32));
}
export function sealSecret(value: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    body.toString("base64url"),
  ].join(".");
}
export function openSecret(value: string) {
  const [version, iv, tag, body] = value.split(".");
  if (version !== "v1" || !iv || !tag || !body) throw new Error("Conexão de pagamento inválida.");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(body, "base64url")), d.final()]).toString("utf8");
}
export function secretHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export function randomSecret() {
  return randomBytes(32).toString("hex");
}
