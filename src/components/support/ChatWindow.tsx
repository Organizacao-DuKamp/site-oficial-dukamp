import { useState } from "react";
import { useSupport } from "@/lib/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Minus, MessageCircle } from "lucide-react";
import { MessageList } from "./MessageList";

export function ChatWindow() {
  const { ticket, messages, open, closeChat, sendMessage, closeTicket, startTicket } = useSupport();
  const [text, setText] = useState("");

  if (!open) return null;
  const isClosed = ticket?.status === "closed";

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await sendMessage(text);
    setText("");
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[340px] max-w-[calc(100vw-2rem)] h-[480px] max-h-[calc(100vh-2rem)] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold">Atendimento Dukamp</div>
            <div className="text-[10px] opacity-80">
              {!ticket
                ? "Sem atendimento"
                : ticket.status === "open"
                  ? "Aguardando atendente"
                  : ticket.status === "in_progress"
                    ? "Em atendimento"
                    : "Encerrado"}
            </div>
          </div>
        </div>
        <button onClick={closeChat} className="p-1 hover:bg-white/10 rounded" aria-label="Minimizar">
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {!ticket ? (
        <div className="flex-1 grid place-items-center p-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground mb-3">Inicie um atendimento com nossa equipe.</p>
            <Button onClick={startTicket}>Iniciar atendimento</Button>
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} selfRole="user" />
          <form onSubmit={onSend} className="border-t p-2 flex gap-2 bg-background">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isClosed ? "Atendimento encerrado" : "Digite sua mensagem..."}
              disabled={isClosed}
            />
            <Button type="submit" size="sm" disabled={isClosed || !text.trim()}>
              Enviar
            </Button>
          </form>
          {!isClosed && (
            <button
              onClick={closeTicket}
              className="text-[11px] text-muted-foreground hover:text-destructive px-3 py-1 border-t flex items-center justify-center gap-1"
            >
              <X className="h-3 w-3" /> Encerrar atendimento
            </button>
          )}
          {isClosed && (
            <div className="text-[11px] text-muted-foreground px-3 py-2 border-t text-center">
              Este atendimento foi encerrado.
            </div>
          )}
        </>
      )}
    </div>
  );
}
