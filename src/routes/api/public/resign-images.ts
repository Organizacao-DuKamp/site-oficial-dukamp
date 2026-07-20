import { createFileRoute } from "@tanstack/react-router";

// One-shot endpoint: rewrite legacy product image URLs (old Supabase project)
// into signed URLs against the current project's `media` bucket.
export const Route = createFileRoute("/api/public/resign-images")({
  server: {
    handlers: {
      GET: async () => handle(),
      POST: async () => handle(),
    },
  },
});

const EXPIRES_IN = 60 * 60 * 24 * 365 * 50; // 50 years

function extractFilename(url: string): string | null {
  // Handles both /object/sign/media/<name>?... and /object/public/media/<name>
  const m = url.match(/\/media\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

async function handle() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, images");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  let updated = 0;
  let skipped = 0;
  const missing: string[] = [];
  const errors: string[] = [];

  for (const p of products ?? []) {
    const imgs: string[] = (p.images as string[] | null) ?? [];
    if (!imgs.length) { skipped++; continue; }

    const newImgs: string[] = [];
    let changed = false;

    for (const url of imgs) {
      // Already a working URL for current project? keep it.
      if (url.includes("pioyrbcdprnplhcoyzam.supabase.co")) {
        newImgs.push(url);
        continue;
      }
      const fname = extractFilename(url);
      if (!fname) { newImgs.push(url); continue; }

      const { data, error: signErr } = await supabaseAdmin
        .storage.from("media")
        .createSignedUrl(fname, EXPIRES_IN);

      if (signErr || !data?.signedUrl) {
        missing.push(fname);
        newImgs.push(url);
        continue;
      }
      newImgs.push(data.signedUrl);
      changed = true;
    }

    if (changed) {
      const { error: upErr } = await supabaseAdmin
        .from("products")
        .update({ images: newImgs })
        .eq("id", p.id);
      if (upErr) errors.push(`${p.id}: ${upErr.message}`);
      else updated++;
    } else {
      skipped++;
    }
  }

  return Response.json({ ok: true, updated, skipped, missingCount: missing.length, missing: missing.slice(0, 20), errors });
}
