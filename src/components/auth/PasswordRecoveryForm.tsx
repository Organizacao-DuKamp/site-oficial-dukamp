import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "dukamp.password-recovery.tokens.v1";

type Step = "email" | "details" | "waiting" | "reset";
type RecoveryStatus = "none" | "pending" | "approved" | "rejected" | "used" | "expired";

type ApiResponse = {
  ok?: boolean;
  token?: string;
  status?: RecoveryStatus;
  error?: string;
  message?: string;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function onlyDigits(value: string, max: number) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatCpf(value: string) {
  return onlyDigits(value, 11)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) {
    return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function readTokens(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getToken(email: string) {
  return readTokens()[normalizeEmail(email)] || "";
}

function saveToken(email: string, token: string) {
  if (typeof window === "undefined") return;
  const tokens = readTokens();
  tokens[normalizeEmail(email)] = token;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

function removeToken(email: string) {
  if (typeof window === "undefined") return;
  const tokens = readTokens();
  delete tokens[normalizeEmail(email)];
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
}

async function callRecovery(body: Record<string, unknown>): Promise<ApiResponse> {
  const response = await fetch("/api/public/password-recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify(body),
  });
  let result: ApiResponse = {};
  try {
    result = (await response.json()) as ApiResponse;
  } catch {
    result = {};
  }
  if (!response.ok) throw new Error(result.error || "Não foi possível concluir a operação.");
  return result;
}

export function PasswordRecoveryForm({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function checkApproval(targetEmail = email) {
    const normalized = normalizeEmail(targetEmail);
    const token = getToken(normalized);
    if (!token) {
      setStep("details");
      return;
    }

    setLoading(true);
    try {
      const result = await callRecovery({ action: "check", email: normalized, token });
      if (result.status === "approved") {
        setStep("reset");
        return;
      }
      if (result.status === "pending") {
        setStep("waiting");
        return;
      }
      if (["rejected", "used", "expired", "none"].includes(result.status || "none")) {
        removeToken(normalized);
        setStep("details");
        if (result.status === "rejected") toast.error("A solicitação anterior foi rejeitada. Você pode enviar uma nova.");
        if (result.status === "expired") toast.error("A autorização expirou. Envie uma nova solicitação.");
        return;
      }
      setStep("details");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível consultar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    const normalized = normalizeEmail(email);
    if (!normalized) return;
    setEmail(normalized);
    await checkApproval(normalized);
  }

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (onlyDigits(cpf, 11).length !== 11) return toast.error("Informe um CPF com 11 dígitos.");
    if (!birthDate) return toast.error("Informe a data de nascimento.");
    if (onlyDigits(phone, 11).length < 10) return toast.error("Informe um telefone de contato válido.");

    setLoading(true);
    try {
      const result = await callRecovery({
        action: "request",
        email: normalizeEmail(email),
        cpf: onlyDigits(cpf, 11),
        birthDate,
        phone: onlyDigits(phone, 11),
      });
      if (result.token) saveToken(email, result.token);
      setStep("waiting");
      toast.success("Solicitação enviada para análise do administrativo.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a solicitação.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 6) return toast.error("A nova senha deve ter no mínimo 6 caracteres.");
    if (newPassword !== confirmPassword) return toast.error("As senhas não conferem.");
    const token = getToken(email);
    if (!token) {
      setStep("details");
      return toast.error("A autorização deste navegador não foi encontrada.");
    }

    setLoading(true);
    try {
      await callRecovery({ action: "reset", email: normalizeEmail(email), token, newPassword });
      removeToken(email);
      toast.success("Senha redefinida com sucesso. Entre com a nova senha.");
      setNewPassword("");
      setConfirmPassword("");
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Recuperar senha</h2>
        <p className="text-sm text-muted-foreground">
          A recuperação é analisada pelo administrativo da Dukamp e não depende de envio de e-mail.
        </p>
      </div>

      {step === "email" && (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <div>
            <Label htmlFor="recovery-email">E-mail da conta</Label>
            <Input id="recovery-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verificando..." : "Continuar"}</Button>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={submitRequest} className="space-y-3">
          <div>
            <Label htmlFor="recovery-account-email">E-mail da conta</Label>
            <Input id="recovery-account-email" type="email" value={email} readOnly className="bg-muted" />
          </div>
          <div>
            <Label htmlFor="recovery-cpf">CPF</Label>
            <Input id="recovery-cpf" inputMode="numeric" value={cpf} onChange={(e) => setCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" maxLength={14} required />
          </div>
          <div>
            <Label htmlFor="recovery-birth">Data de nascimento</Label>
            <Input id="recovery-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            <p className="mt-1 text-[11px] text-muted-foreground">A data será enviada para conferência manual do administrativo.</p>
          </div>
          <div>
            <Label htmlFor="recovery-phone">Telefone de contato</Label>
            <Input id="recovery-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(17) 99999-9999" maxLength={15} required />
            <p className="mt-1 text-[11px] text-muted-foreground">Pode ser um telefone diferente do que estiver cadastrado na conta.</p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar solicitação"}</Button>
        </form>
      )}

      {step === "waiting" && (
        <div className="space-y-3 rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium">Solicitação aguardando análise.</p>
          <p className="text-xs text-muted-foreground">Depois que o administrativo aprovar, volte a esta recuperação neste mesmo navegador. Ao informar o e-mail, o campo para criar uma nova senha será liberado.</p>
          <Button type="button" className="w-full" onClick={() => checkApproval()} disabled={loading}>{loading ? "Verificando..." : "Verificar aprovação"}</Button>
        </div>
      )}

      {step === "reset" && (
        <form onSubmit={submitReset} className="space-y-3 rounded-md border p-4">
          <div>
            <Label htmlFor="recovery-new-password">Nova senha</Label>
            <Input id="recovery-new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} required autoComplete="new-password" />
          </div>
          <div>
            <Label htmlFor="recovery-confirm-password">Confirmar nova senha</Label>
            <Input id="recovery-confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={6} required autoComplete="new-password" />
          </div>
          <p className="text-[11px] text-muted-foreground">A autorização é válida por 24 horas e só pode ser usada uma vez.</p>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Salvando..." : "Redefinir senha"}</Button>
        </form>
      )}

      <Button type="button" variant="ghost" className="w-full" onClick={onBack}>Voltar para o login</Button>
    </div>
  );
}
