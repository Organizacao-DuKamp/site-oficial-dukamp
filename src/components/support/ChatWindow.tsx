import { useState } from "react";
import { useSupport } from "@/lib/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Minus, MessageCircle } from "lucide-react";
import { MessageList } from "./MessageList";
import { toast } from "sonner";

export function ChatWindow() {
  const { ticket, seller, messages, open, closeChat, sendMessage, closeTicket, startTicket, loading } = useSupport();
  const [text, setText] = useState("");

  if (!open) return null;
  const isClosed = ticket?.status === "closed";

  async function onSend(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    const message = text.trim();
    setText("");
    try {
      await sendMessage(message);
    } catch (error) {
      setText(message);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a mensagem.");
    }
  }

  async function start() {
    try {
      await startTicket();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível iniciar a conversa.");
    }
  }

  async function close() {
    try {
      await closeTicket();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar a conversa.");
    }
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 flex h-[480px] max-h-[calc(100vh-2rem)] w-[340px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-background shadow-2xl">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          <div>
            <div className="text-sm font-semibold">{seller?.name ?? "Seu vendedor"}</div>
            <div className="text-[10px] opacity-80">
              {!ticket
                ? "Conversa ainda não iniciada"
                : ticket.status === "open"
                  ? "Conversa aberta"
                  : ticket.status === "in_progress"
                    ? "Em atendimento"
                    : "Encerrada"}
            </div>
          </div>
        </div>
        <button onClick={closeChat} className="rounded p-1 hover:bg-white/10" aria-label="Minimizar">
          <Minus className="h-4 w-4" />
        </button>
      </div>

      {!ticket ? (
        <div className="grid flex-1 place-items-center p-4 text-center">
          <div>
            <p className="mb-3 text-sm text-muted-foreground">Inicie uma conversa com {seller?.name}.</p>
            <Button onClick={() => void start()} disabled={loading}>
              {loading ? "Iniciando..." : "Iniciar conversa"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <MessageList messages={messages} selfRole="user" />
          <form onSubmit={onSend} className="flex gap-2 border-t bg-background p-2">
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={isClosed ? "Conversa encerrada" : "Digite sua mensagem..."}
              disabled={isClosed || loading}
            />
            <Button type="submit" size="sm" disabled={isClosed || loading || !text.trim()}>
              Enviar
            </Button>
          </form>
          {!isClosed && (
            <button
              onClick={() => void close()}
              className="flex items-center justify-center gap-1 border-t px-3 py-1 text-[11px] text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> Encerrar conversa
            </button>
          )}
          {isClosed && (
            <div className="border-t px-3 py-2 text-center text-[11px] text-muted-foreground">
              Esta conversa foi encerrada.
            </div>
          )}
        </>
      )}
    </div>
  );
}
