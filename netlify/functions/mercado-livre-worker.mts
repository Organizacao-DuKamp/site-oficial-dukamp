import { getMercadoLivreService } from "../../src/lib/mercado-livre.server";

// Durable queue retry every minute, in UTC. No public worker URL or shared cron secret.
export default async () => {
  const service = await getMercadoLivreService();
  const started = Date.now();
  let processed = 0;
  for (let batch = 0; batch < 10; batch++) {
    const result = await service.processQueue(3);
    processed += result.processed;
    // Leave 26 seconds for a slow final batch within the 30-second scheduled-function limit.
    if (!result.configured || result.processed < 3 || Date.now() - started >= 4_000) break;
  }
  console.info("[mercado-livre]", JSON.stringify({ event: "worker_completed", processed }));
};

export const config = { schedule: "* * * * *" };
