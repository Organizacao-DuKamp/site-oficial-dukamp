import type { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MainNav } from "./MainNav";
import { InstitutionalSidebar } from "./InstitutionalSidebar";
import { ApprovalNoticeModal } from "./ApprovalNoticeModal";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <div className="sticky top-0 z-50 bg-background shadow-sm">
        <Header />
        <MainNav />
      </div>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 flex-1">
        <div className="layout-grid grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <main className="min-w-0 order-1">{children}</main>
          <div className="hidden lg:block order-2 min-w-0">
            <InstitutionalSidebar />
          </div>
        </div>
      </div>
      <Footer />
      <ApprovalNoticeModal />
    </div>
  );
}
