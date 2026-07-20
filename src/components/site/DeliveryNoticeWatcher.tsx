import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { getMyDeliveryNotices, markDeliveryNotified } from "@/lib/orders.functions";
import { toast } from "sonner";

export function DeliveryNoticeWatcher() {
  const { user } = useAuth();
  const fetchNotices = useServerFn(getMyDeliveryNotices);
  const markNotified = useServerFn(markDeliveryNotified);
  const alreadyShown = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) {
      alreadyShown.current.clear();
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const notices = await fetchNotices();
        if (cancelled) return;
        for (const n of notices) {
          if (alreadyShown.current.has(n.id)) continue;
          alreadyShown.current.add(n.id);
          const names = n.product_names.slice(0, 3).join(", ") || "seu pedido";
          toast.success(`✅ Entregue! ${names} chegou ao seu destino.`, {
            description: `Pedido ${n.order_number}`,
            duration: 10000,
          });
          markNotified({ data: { orderId: n.id } }).catch(() => {});
        }
      } catch {
        // silencia
      }
    }

    // Roda no login/mount e depois a cada 60s + no focus da janela
    check();
    const interval = window.setInterval(check, 60_000);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [user, fetchNotices, markNotified]);

  return null;
}
