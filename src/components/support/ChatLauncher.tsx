import { useSupport } from "@/lib/support";
import { useAuth } from "@/lib/auth";
import { MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { ChatWindow } from "./ChatWindow";

export function SupportWidget() {
  const { user, isAdmin } = useAuth();
  const { seller, open, openChat, unread } = useSupport();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (!user || isAdmin || !seller) return null;
  if (pathname.startsWith("/admin") || pathname.startsWith("/vendedor") || pathname.startsWith("/auth")) return null;

  return (
    <>
      <ChatWindow />
      {!open && (
        <button
          onClick={openChat}
          className="fixed bottom-4 left-4 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg grid place-items-center hover:scale-105 transition-transform"
          aria-label={`Conversar com ${seller.name}`}
        >
          <MessageCircle className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center px-1">
              {unread}
            </span>
          )}
        </button>
      )}
    </>
  );
}
