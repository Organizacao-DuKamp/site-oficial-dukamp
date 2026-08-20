import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";
import logoFixed from "@/assets/dukamp-logo.webp";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({ meta: [{ title: "Recuperar senha — Dukamp" }] }),
  component: PasswordRecoveryPage,
});

function PasswordRecoveryPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src={logoFixed} alt="Dukamp Saúde Animal" className="h-16 object-contain" />
        </Link>
        <div className="rounded-lg border bg-card p-6">
          <PasswordRecoveryForm onBack={() => navigate({ to: "/auth" })} />
        </div>
      </div>
    </div>
  );
}
