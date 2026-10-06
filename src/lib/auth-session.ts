import type { Session } from "@supabase/supabase-js";

export function createAuthSessionHandler(callbacks: {
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  clearProfile: () => void;
  loadProfile: (session: Session, isCurrent: () => boolean) => Promise<void>;
  onError: (error: unknown) => void;
}, schedule: (work: () => void) => void = work => { setTimeout(work, 0); }) {
  let userId: string | null = null;
  let revision = 0;
  let disposed = false;

  return {
    handle(nextSession: Session | null) {
      if (disposed) return;
      const nextUserId = nextSession?.user.id ?? null;
      const userChanged = nextUserId !== userId;
      userId = nextUserId;
      const request = ++revision;
      const isCurrent = () => !disposed && revision === request;
      callbacks.setSession(nextSession);

      if (!nextSession) {
        callbacks.clearProfile();
        callbacks.setLoading(false);
        return;
      }
      if (userChanged) {
        callbacks.clearProfile();
        callbacks.setLoading(true);
      }
      // A same-user session refresh must not unmount the active page.
      // Run permission queries outside Supabase's synchronous auth callback.
      schedule(() => {
        if (!isCurrent()) return;
        void callbacks.loadProfile(nextSession, isCurrent)
          .catch(error => { if (isCurrent()) callbacks.onError(error); })
          .finally(() => { if (isCurrent()) callbacks.setLoading(false); });
      });
    },
    dispose() {
      disposed = true;
      revision++;
    },
  };
}
