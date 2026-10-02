import { createClient } from "@supabase/supabase-js";
import { isIP } from "node:net";

export function trustedRequestIp(request: Request) {
  const raw = request.headers.get("x-nf-client-connection-ip");
  return raw && isIP(raw) ? raw : null;
}

// Call only after validating the user's token. A separate client avoids sharing
// one request's identity with concurrent requests in the service-role singleton.
export function createAuditedAdminClient(userId: string | null, request: Request) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!key || !url) throw new Error("Supabase administrativo não configurado");
  const ip = trustedRequestIp(request);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_secret_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      if (userId) headers.set("x-dukamp-actor-id", userId);
      if (ip) headers.set("x-dukamp-actor-ip", ip);
      return fetch(input, { ...init, headers });
    } },
  });
}
