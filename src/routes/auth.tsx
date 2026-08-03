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

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Dukamp" }] }),
  component: AuthPage,
});

const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="h-10 w-10 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">D</div>
          <div className="font-bold">Dukamp Saúde Animal</div>
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
        <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="login-password">Senha</Label>
        <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

type AccountKind = "cliente" | "produtor" | "empresa";

function RegisterForm() {
  const [accountKind, setAccountKind] = useState<AccountKind>("cliente");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");

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

  const [challenge, setChallenge] = useState(makeChallenge);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const needsExtra = accountKind !== "cliente";

  const helper = useMemo(() => {
    if (accountKind === "cliente") return "Conta padrão. Pode ser necessário confirmar o e-mail antes do primeiro acesso.";
    if (accountKind === "produtor") return "Solicitação enviada para análise da equipe Dukamp. Após aprovação seu acesso como Produtor Rural será liberado.";
    return "Solicitação de conta Empresa enviada para análise da equipe Dukamp. Após aprovação seu acesso Empresa será liberado.";
  }, [accountKind]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!fullName.trim()) return toast.error("Informe seu nome completo.");
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres.");
    if (password !== confirm) return toast.error("As senhas não conferem.");
    if (!phone.trim()) return toast.error("Informe o telefone.");

    if (needsExtra) {
      if (!cpf.trim()) return toast.error("Informe o CPF.");
      if (!fazenda.trim()) return toast.error("Informe a Fazenda.");
      if (!cnpjPropriedade.trim()) return toast.error("Informe o CNPJ da propriedade.");
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
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            requested_type: accountKind,
          },
        },
      });

      if (error) {
        toast.error(traduzErroAuth(error.message));
        setChallenge(makeChallenge());
        setAnswer("");
        return;
      }

      if (!signUpData.user?.id) {
        toast.error("O cadastro não foi concluído. Tente novamente.");
        return;
      }

      if (needsExtra) {
        const { error: reqErr } = await (supabase as any).from("account_requests").insert({
          user_id: signUpData.user.id,
          full_name: fullName.trim(),
          email: normalizedEmail,
          requested_type: accountKind,
          uf,
          cnpj: accountKind === "empresa" ? cnpjPropriedade.trim() : null,
          cpf: cpf.trim(),
          phone: phone.trim(),
          contact_email: cobEmail.trim(),
          fazenda: fazenda.trim(),
          cnpj_propriedade: cnpjPropriedade.trim(),
          nome_propriedade: nomePropriedade.trim(),
          inscricao_estadual: inscricaoEstadual.trim(),
          municipio_propriedade: municipioPropriedade.trim(),
          estado_propriedade: uf,
          cobranca_rua: cobRua.trim(),
          cobranca_bairro: cobBairro.trim(),
          cobranca_numero: cobNumero.trim(),
          cobranca_municipio: cobMunicipio.trim(),
          cobranca_cep: cobCep.trim(),
          cobranca_telefone: cobTelefone.trim(),
          cobranca_email: cobEmail.trim(),
          is_apartamento: isApto,
          apartamento_info: isApto ? aptoInfo.trim() : null,
        });

        if (reqErr) {
          if (!signUpData.session) {
            setPendingConfirmationEmail(normalizedEmail);
            toast.error("A conta foi criada, mas a solicitação não pôde ser registrada. Não tente cadastrar novamente. Confirme o e-mail e fale com a equipe Dukamp.");
          } else {
            toast.error("Conta criada, mas a solicitação falhou: " + reqErr.message);
          }
          return;
        }

        if (signUpData.session) {
          toast.success("Solicitação enviada! Aguarde aprovação da equipe Dukamp.");
        } else {
          setPendingConfirmationEmail(normalizedEmail);
          toast.success("Conta criada e solicitação enviada! Confirme seu e-mail para concluir o acesso.");
        }
        return;
      }

      if (signUpData.session) {
        toast.success("Conta criada! Você já está conectado.");
      } else {
        setPendingConfirmationEmail(normalizedEmail);
        toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      }
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

  if (pendingConfirmationEmail) {
    return (
      <div className="space-y-4 rounded-md border bg-muted/40 p-4 text-center">
        <div>
          <h3 className="font-semibold">Confira seu e-mail</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            A conta de <strong>{pendingConfirmationEmail}</strong> já foi criada. Abra o e-mail da Dukamp e confirme o cadastro antes de tentar entrar.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          Não envie o cadastro novamente, pois isso pode bloquear temporariamente novos e-mails de confirmação.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setPendingConfirmationEmail(null);
            setChallenge(makeChallenge());
            setAnswer("");
          }}
        >
          Cadastrar outro e-mail
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label>Tipo de conta</Label>
        <Select value={accountKind} onValueChange={(v) => setAccountKind(v as AccountKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cliente">Consumidor</SelectItem>
            <SelectItem value="produtor">Produtor Rural</SelectItem>
            <SelectItem value="empresa">Empresa</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">{helper}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="r-name">Nome completo</Label>
          <Input id="r-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="r-email">E-mail</Label>
          <Input id="r-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="r-password">Senha</Label>
          <Input id="r-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="r-confirm">Confirmar senha</Label>
          <Input id="r-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="r-phone">Telefone</Label>
          <Input id="r-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" required />
        </div>
      </div>

      {needsExtra && (
        <div className="space-y-4">
          <div className="space-y-3 rounded-md border bg-muted/40 p-3">
            <h3 className="text-sm font-semibold">
              {accountKind === "empresa" ? "Dados da empresa/propriedade" : "Dados da propriedade"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-cpf">CPF</Label>
                <Input id="r-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-fazenda">Fazenda</Label>
                <Input id="r-fazenda" value={fazenda} onChange={(e) => setFazenda(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-cnpjp">CNPJ da propriedade</Label>
                <Input id="r-cnpjp" value={cnpjPropriedade} onChange={(e) => setCnpjPropriedade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-nomep">Nome da propriedade</Label>
                <Input id="r-nomep" value={nomePropriedade} onChange={(e) => setNomePropriedade(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-ie">Inscrição estadual</Label>
                <Input id="r-ie" value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="r-munp">Município da propriedade</Label>
                <Input id="r-munp" value={municipioPropriedade} onChange={(e) => setMunicipioPropriedade(e.target.value)} />
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
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="c-rua">Rua</Label>
                <Input id="c-rua" value={cobRua} onChange={(e) => setCobRua(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-bairro">Bairro</Label>
                <Input id="c-bairro" value={cobBairro} onChange={(e) => setCobBairro(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-num">Número</Label>
                <Input id="c-num" value={cobNumero} onChange={(e) => setCobNumero(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-mun">Município</Label>
                <Input id="c-mun" value={cobMunicipio} onChange={(e) => setCobMunicipio(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-cep">CEP</Label>
                <Input id="c-cep" value={cobCep} onChange={(e) => setCobCep(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-tel">Telefone de cobrança</Label>
                <Input id="c-tel" value={cobTelefone} onChange={(e) => setCobTelefone(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="c-email">E-mail pessoal para cobrança</Label>
                <Input id="c-email" type="email" value={cobEmail} onChange={(e) => setCobEmail(e.target.value)} />
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
                  <Input id="c-aptoinfo" value={aptoInfo} onChange={(e) => setAptoInfo(e.target.value)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="r-challenge">Quanto é {challenge.a} + {challenge.b}?</Label>
        <Input id="r-challenge" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Enviando..." : needsExtra ? "Enviar solicitação" : "Cadastrar"}
      </Button>
    </form>
  );
}