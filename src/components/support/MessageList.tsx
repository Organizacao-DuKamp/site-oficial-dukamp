import { type SupportMessage } from "@/lib/support";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function MessageList({
  messages,
  selfRole,
  className,
}: {
  messages: SupportMessage[];
  selfRole: "user" | "admin";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={ref} className={cn("flex-1 overflow-y-auto p-3 space-y-2 bg-muted/20", className)}>
      {messages.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-8">Envie uma mensagem para iniciar.</p>
      )}
      {messages.map((m) => {
        const isSelf = m.sender_role === selfRole;
        return (
          <div key={m.id} className={cn("flex", isSelf ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
                isSelf ? "bg-primary text-primary-foreground" : "bg-card border",
              )}
            >
              {m.message}
              <div className={cn("text-[10px] mt-1 opacity-70", isSelf ? "text-right" : "text-left")}>
                {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

