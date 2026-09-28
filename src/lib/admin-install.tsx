import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallState = {
  canPrompt: boolean;
  installed: boolean;
  install: () => Promise<boolean>;
};

const InstallContext = createContext<InstallState | null>(null);

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function AdminInstallProvider({ children }: { children: ReactNode }) {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!promptEvent) return false;
    const event = promptEvent;
    setPromptEvent(null);
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome === "accepted";
  }

  return (
    <InstallContext.Provider value={{ canPrompt: Boolean(promptEvent), installed, install }}>
      {children}
    </InstallContext.Provider>
  );
}

export function useAdminInstall() {
  const context = useContext(InstallContext);
  if (!context) throw new Error("AdminInstallProvider ausente.");
  return context;
}
