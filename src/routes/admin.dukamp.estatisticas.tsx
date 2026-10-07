import { createFileRoute } from "@tanstack/react-router";
import { SellerStatisticsDialog } from "@/components/admin/SellerStatisticsDialog";
import { useAuth } from "@/lib/auth";
import { PROTECTED_ADMIN_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/admin/dukamp/estatisticas")({
  ssr: false,
  component: DukampStatisticsPage,
});

function DukampStatisticsPage() {
  const { user, isMasterAdmin, loading } = useAuth();
  if (loading) return <p role="status">Carregando...</p>;
  if (!isMasterAdmin || user?.email?.toLowerCase() !== PROTECTED_ADMIN_EMAIL) {
    return <div role="alert" className="rounded-2xl border bg-card p-6">Esta área está disponível somente para a conta-mestre da DuKamp.</div>;
  }
  return <SellerStatisticsDialog embedded />;
}
