import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { traduzErroAuth } from "@/lib/auth-errors";
import { useRegisteredSellers } from "@/lib/sellers";
import logoFixed from "@/assets/dukamp-logo.webp";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Dukamp" }] }),
  component: AuthPage,
});

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

function onlyDigits(value: string, max = Number.POSITIVE_INFINITY) {
  return value.replace(/\D/g, "").slice(0, max);
}

function formatCpfCnpj(value: string) {
  const digits = onlyDigits(value, 14);
  if (digits.length <= 11) {
    return digits
      .replace(/^(\d{3})(\d)/, "$1.$2")
      .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\/\d{4})(\d)/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatCep(value: string) {
  return onlyDigits(value, 8).replace(/^(\d{5})(\d)/, "$1-$2");
}

function makeChallenge() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

function AuthPage() {
  const { signIn, user, isAdmin, accountType, loading } = useAuth();
  const nav = useNavigate();
  const initialTab = typeof window !== "undefined" && window.location.hash === "#cadastro" ? "register" : "login";

  useEffect(() => {
    if (loading || !user) return;
    if (isAdmin) nav({ to: "/admin" });
    else if (accountType === "vendedor") nav({ to: "/vendedor" });
    else nav({ to: "/dashboard" });
  }, [user, isAdmin, accountType, loading, nav]);

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center mb-6">
          <img src={logoFixed} alt="Dukamp Saúde Animal" className="h-16 object-contain" />
        </Link>
        <div className="rounded-lg border bg-card p-6">
          <Tabs defaultValue={initialTab}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="mt-4">
              <LoginForm onLogin={signIn} />
            </TabsContent>
            <TabsContent value="register" className="mt-4">
              <RegisterForm />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (e: string, p: string) => Promise<{ error?: string }> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await onLogin(email, password);
    setLoading(false);
    if (error) toast.error(traduzErroAuth(error));
    else toast.success("Bem-vindo!");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-sm mx-auto">
      <div>
        <Label htmlFor="login-email">E-mail</Label>
        <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="login-password">Senha</Label>
        <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

type AccountKind = "cliente" | "produtor" | "empresa";
type LookupStatus = "idle" | "loading" | "found" | "not-found" | "error";

type RegisterResponse = {
  ok?: boolean;
  error?: string;
  needsApproval?: boolean;
};

type CustomerPrefill = {
  fullName?: string;
  phone?: string;
  email?: string;
  fazenda?: string;
  cnpjPropriedade?: string;
  nomePropriedade?: string;
  inscricaoEstadual?: string;
  municipioPropriedade?: string;
  uf?: string;
  cobRua?: string;
  cobBairro?: string;
  cobNumero?: string;
  cobMunicipio?: string;
  cobCep?: string;
  cobTelefone?: string;
  cobEmail?: string;
};

type CustomerLookupResponse = {
  found?: boolean;
  customer?: CustomerPrefill;
  error?: string;
};

function RegisterForm() {
  const { data: sellers = [], isLoading: sellersLoading } = useRegisteredSellers();
  const [accountKind, setAccountKind] = useState<AccountKind>("cliente");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [sellerId, setSellerId] = useState("none");

  // Produtor/Empresa
  const [cpf, setCpf] = useState("");
  const [fazenda, setFazenda] = useState("");
  const [cnpjPropriedade, setCnpjPropriedade] = useState("");
  const [nomePropriedade, setNomePropriedade] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [municipioPropriedade, setMunicipioPropriedade] = useState("");
  const [uf, setUf] = useState("");

  // Cobrança
  const [cobRua, setCobRua] = useState("");
  const [cobBairro, setCobBairro] = useState("");
  const [cobNumero, setCobNumero] = useState("");
  const [cobMunicipio, setCobMunicipio] = useState("");
  const [cobCep, setCobCep] = useState("");
  const [cobTelefone, setCobTelefone] = useState("");
  const [cobEmail, setCobEmail] = useState("");
  const [isApto, setIsApto] = useState(false);
  const [aptoInfo, setAptoInfo] = useState("");

  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [challenge, setChallenge] = useState(makeChallenge);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const needsExtra = accountKind !== "cliente";
  const producerDocumentDigits = accountKind === "produtor" ? onlyDigits(cpf, 14) : "";

  const helper = useMemo(() => {
    if (accountKind === "cliente") return "Conta padrão. Acesso imediato.";
    if (accountKind === "produtor") return "Informe primeiro seu CPF ou CNPJ. Se você já for cliente Dukamp, os dados disponíveis serão preenchidos automaticamente para você revisar.";
    return "Solicitação de conta Empresa enviada para análise da equipe Dukamp. Após aprovação seu acesso Empresa será liberado.";
  }, [accountKind]);

  useEffect(() => {
    if (accountKind !== "produtor") {
      setLookupStatus("idle");
      return;
    }

    if (producerDocumentDigits.length !== 11 && producerDocumentDigits.length !== 14) {
      setLookupStatus("idle");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupStatus("loading");
      try {
        const params = new URLSearchParams({ document: producerDocumentDigits });
        const response = await fetch(`/api/public/register?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as CustomerLookupResponse;
        if (!response.ok) throw new Error(result.error || "Falha ao consultar cadastro.");
        if (!result.found || !result.customer) {
          setLookupStatus("not-found");
          return;
        }

        const customer = result.customer;
        setFullName(customer.fullName || "");
        setPhone(customer.phone ? formatPhone(customer.phone) : "");
        setEmail(customer.email || "");
        setFazenda(customer.fazenda || "");
        setCnpjPropriedade(customer.cnpjPropriedade ? formatCpfCnpj(customer.cnpjPropriedade) : "");
        setNomePropriedade(customer.nomePropriedade || "");
        setInscricaoEstadual(customer.inscricaoEstadual || "");
        setMunicipioPropriedade(customer.municipioPropriedade || "");
        setUf(customer.uf || "");
        setCobRua(customer.cobRua || "");
        setCobBairro(customer.cobBairro || "");
        setCobNumero(customer.cobNumero || "");
        setCobMunicipio(customer.cobMunicipio || "");
        setCobCep(customer.cobCep ? formatCep(customer.cobCep) : "");
        setCobTelefone(customer.cobTelefone ? formatPhone(customer.cobTelefone) : customer.phone ? formatPhone(customer.phone) : "");
        setCobEmail(customer.cobEmail || customer.email || "");
        setLookupStatus("found");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[register] Falha ao preencher cadastro por CPF/CNPJ:", error);
        setLookupStatus("error");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [accountKind, producerDocumentDigits]);

  function handleAccountKindChange(value: string) {
    setAccountKind(value as AccountKind);
    setLookupStatus("idle");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!fullName.trim()) return toast.error("Informe seu nome completo.");
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    if (!phone.trim()) return toast.error("Informe o telefone.");

    if (needsExtra) {
      if (accountKind === "produtor") {
        if (producerDocumentDigits.length !== 11 && producerDocumentDigits.length !== 14) {
          return toast.error("Informe um CPF ou CNPJ válido.");
        }
      } else {
        if (onlyDigits(cpf).length !== 11) return toast.error("Informe o CPF do responsável.");
        if (onlyDigits(cnpjPropriedade).length !== 14) return toast.error("Informe o CNPJ da empresa/propriedade.");
      }
      if (!fazenda.trim()) return toast.error("Informe a Fazenda.");
      if (!nomePropriedade.trim()) return toast.error("Informe o nome da propriedade.");
      if (!inscricaoEstadual.trim()) return toast.error("Informe a inscrição estadual.");
      if (!municipioPropriedade.trim()) return toast.error("Informe o município da propriedade.");
      if (!uf) return toast.error("Selecione o estado.");
      if (!cobRua.trim() || !cobBairro.trim() || !cobNumero.trim() || !cobMunicipio.trim() || !cobCep.trim() || !cobTelefone.trim() || !cobEmail.trim()) {
        return toast.error("Preencha todos os campos da área de cobrança.");
      }
      if (isApto && !aptoInfo.trim()) return toast.error("Informe os dados do apartamento.");
    }

    if (Number(answer) !== challenge.answer) {
      setChallenge(makeChallenge());
      setAnswer("");
      return toast.error("Resposta do desafio incorreta.");
    }

    const normalizedEmail = email.trim().toLowerCase();
    submittingRef.current = true;
    setLoading(true);

    try {
      const producerIsCnpj = accountKind === "produtor" && producerDocumentDigits.length === 14;
      const response = await fetch("/api/public/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountKind,
          fullName: fullName.trim(),
          email: normalizedEmail,
          password,
          phone: phone.trim(),
          sellerId: sellerId === "none" ? null : sellerId,
          cpf: producerIsCnpj ? "" : cpf,
          fazenda,
          cnpjPropriedade: producerIsCnpj ? cpf : cnpjPropriedade,
          nomePropriedade,
          inscricaoEstadual,
          municipioPropriedade,
          uf,
          cobRua,
          cobBairro,
          cobNumero,
          cobMunicipio,
          cobCep,
          cobTelefone,
          cobEmail,
          isApto,
          aptoInfo,
          challengeA: challenge.a,
          challengeB: challenge.b,
          challengeAnswer: Number(answer),
        }),
      });

      let result: RegisterResponse = {};
      try {
        result = (await response.json()) as RegisterResponse;
      } catch {
        result = {};
      }

      if (!response.ok || !result.ok) {
        toast.error(result.error || "Não foi possível criar a conta. Tente novamente.");
        setChallenge(makeChallenge());
        setAnswer("");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) {
        toast.success(
          needsExtra
            ? "Conta criada e solicitação enviada! Entre com seu e-mail e senha."
            : "Conta criada! Entre com seu e-mail e senha.",
        );
        return;
      }

      toast.success(
        needsExtra
          ? "Conta criada e solicitação enviada! Aguarde a aprovação da equipe Dukamp."
          : "Conta criada! Você já está conectado.",
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : null;
      toast.error(traduzErroAuth(message));
      setChallenge(makeChallenge());
      setAnswer("");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Tipo de conta</Label>
        <Select value={accountKind} onValueChange={handleAccountKindChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Consumidor</SelectItem>
            <SelectItem value="produtor">Produtor Rural</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">{helper}</p>
      </div>

      {accountKind === "produtor" && (
        <div className="rounded-md border bg-muted/40 p-3">
          <Label htmlFor="r-cpf">CPF/CNPJ</Label>
          <Input
            id="r-cpf"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
            placeholder="000.000.000-00 ou 00.000.000/0000-00"
            maxLength={18}
            autoComplete="off"
          />
          <p className={`text-[11px] mt-1 ${lookupStatus === "error" ? "text-destructive" : "text-muted-foreground"}`} aria-live="polite">
            {lookupStatus === "idle" && "Digite seu CPF ou CNPJ para buscar seus dados na base de clientes Dukamp."}
            {lookupStatus === "loading" && "Buscando seu cadastro na Dukamp..."}
            {lookupStatus === "found" && "Cadastro encontrado. Preenchemos os dados disponíveis — revise e corrija o que for necessário."}
            {lookupStatus === "not-found" && "Cadastro não encontrado. Você pode continuar preenchendo normalmente."}
            {lookupStatus === "error" && "Não foi possível consultar agora. Você pode preencher os dados manualmente."}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="r-name">Nome completo</Label>
          <Input id="r-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome completo" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="r-email">E-mail</Label>
          <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" required autoComplete="email" />
        </div>
        <div>
          <Label htmlFor="r-password">Senha <span className="font-normal text-muted-foreground">(mín. 6 caracteres)</span></Label>
          <Input id="r-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} placeholder="6 caracteres ou mais" required autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="r-confirm">Confirmar senha</Label>
          <Input id="r-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} placeholder="Digite a senha novamente" required autoComplete="new-password" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="r-phone">Telefone</Label>
          <Input id="r-phone" inputMode="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} placeholder="(17) 99999-9999" maxLength={15} required autoComplete="tel" />
        </div>
        <div className="sm:col-span-2">
          <Label>Vendedor Dukamp (opcional)</Label>
          <Select value={sellerId} onValueChange={setSellerId} disabled={sellersLoading}>
            <SelectTrigger><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum vendedor</SelectItem>
              {sellers.map((seller) => (
                <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground mt-1">
            Este vendedor será o destinatário do seu chat.
          </p>
        </div>
      </div>

      {needsExtra && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-md border bg-muted/40 p-3">
            <h3 className="text-sm font-semibold">
              {accountKind === "empresa" ? "Dados da empresa/propriedade" : "Dados da propriedade"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {accountKind === "empresa" && (
                <div>
                  <Label htmlFor="r-cpf-responsavel">CPF do responsável</Label>
                  <Input
                    id="r-cpf-responsavel"
                    inputMode="numeric"
                    value={cpf}
                    onChange={(e) => setCpf(formatCpfCnpj(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    autoComplete="off"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="r-fazenda">Fazenda</Label>
                <Input id="r-fazenda" value={fazenda} onChange={(e) => setFazenda(e.target.value)} placeholder="Ex.: Fazenda Santa Maria" />
              </div>
              {accountKind === "empresa" && (
                <div>
                  <Label htmlFor="r-cnpjp">CNPJ da empresa/propriedade</Label>
                  <Input id="r-cnpjp" inputMode="numeric" value={cnpjPropriedade} onChange={(e) => setCnpjPropriedade(formatCpfCnpj(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} />
                </div>
              )}
              <div>
                <Label htmlFor="r-nomep">Nome da propriedade</Label>
                <Input id="r-nomep" value={nomePropriedade} onChange={(e) => setNomePropriedade(e.target.value)} placeholder="Nome pelo qual a propriedade é conhecida" />
              </div>
              <div>
                <Label htmlFor="r-ie">Inscrição estadual</Label>
                <Input id="r-ie" value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} placeholder="Inscrição estadual" />
              </div>
              <div>
                <Label htmlFor="r-munp">Município da propriedade</Label>
                <Input id="r-munp" value={municipioPropriedade} onChange={(e) => setMunicipioPropriedade(e.target.value)} placeholder="Ex.: Monte Aprazível" />
              </div>
              <div className="sm:col-span-2">
                <Label>Estado</Label>
                <Select value={uf} onValueChange={setUf}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border bg-muted/40 p-3">
            <h3 className="text-sm font-semibold">Área de cobrança</h3>
            <p className="text-[11px] text-muted-foreground">Use o endereço onde você recebe cobranças e documentos.</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="c-rua">Rua / Endereço</Label>
                <Input id="c-rua" value={cobRua} onChange={(e) => setCobRua(e.target.value)} placeholder="Rua, avenida ou estrada" autoComplete="street-address" />
              </div>
              <div>
                <Label htmlFor="c-bairro">Bairro</Label>
                <Input id="c-bairro" value={cobBairro} onChange={(e) => setCobBairro(e.target.value)} placeholder="Bairro" />
              </div>
              <div>
                <Label htmlFor="c-num">Número</Label>
                <Input id="c-num" value={cobNumero} onChange={(e) => setCobNumero(e.target.value)} placeholder="Número ou S/N" />
              </div>
              <div>
                <Label htmlFor="c-mun">Município</Label>
                <Input id="c-mun" value={cobMunicipio} onChange={(e) => setCobMunicipio(e.target.value)} placeholder="Município" autoComplete="address-level2" />
              </div>
              <div>
                <Label htmlFor="c-cep">CEP</Label>
                <Input id="c-cep" inputMode="numeric" value={cobCep} onChange={(e) => setCobCep(formatCep(e.target.value))} placeholder="00000-000" maxLength={9} autoComplete="postal-code" />
              </div>
              <div>
                <Label htmlFor="c-tel">Telefone de cobrança</Label>
                <Input id="c-tel" inputMode="tel" value={cobTelefone} onChange={(e) => setCobTelefone(formatPhone(e.target.value))} placeholder="(17) 99999-9999" maxLength={15} autoComplete="tel" />
              </div>
              <div>
                <Label htmlFor="c-email">E-mail para cobrança</Label>
                <Input id="c-email" type="email" value={cobEmail} onChange={(e) => setCobEmail(e.target.value)} placeholder="cobranca@exemplo.com" autoComplete="email" />
              </div>
              <div className="sm:col-span-2 flex items-start gap-2 pt-1">
                <Checkbox id="c-apto" checked={isApto} onCheckedChange={(v) => setIsApto(v === true)} />
                <div className="grid gap-1">
                  <Label htmlFor="c-apto" className="cursor-pointer">O endereço é um apartamento?</Label>
                  <p className="text-[11px] text-muted-foreground">Marque se o endereço de cobrança for apartamento.</p>
                </div>
              </div>
              {isApto && (
                <div className="sm:col-span-2">
                  <Label htmlFor="c-aptoinfo">Dados do apartamento (bloco, número, complemento)</Label>
                  <Input id="c-aptoinfo" value={aptoInfo} onChange={(e) => setAptoInfo(e.target.value)} placeholder="Ex.: Bloco B, ap. 42" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="r-challenge">Quanto é {challenge.a} + {challenge.b}?</Label>
        <Input id="r-challenge" inputMode="numeric" value={answer} onChange={(e) => setAnswer(onlyDigits(e.target.value, 2))} placeholder="Resposta" required />
      </div>
      <Button type="submit" className="w-full" disabled={loading || lookupStatus === "loading"}>
        {loading ? "Enviando..." : needsExtra ? "Enviar solicitação" : "Cadastrar"}
      </Button>
    </form>
  );
}