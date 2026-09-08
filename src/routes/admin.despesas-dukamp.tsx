import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  Menu,
  Search,
  TrendingDown,
  WalletCards,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/admin/despesas-dukamp")({
  ssr: false,
  component: DukampExpensesPage,
});

type ExpenseCategory = {
  code: number;
  name: string;
  sort_order: number;
};

type ExpenseSubcategory = {
  code: number;
  category_code: number;
  name: string;
  sort_order: number;
};

type ExpenseValue = {
  year: number;
  month: number;
  subcategory_code: number;
  amount: number;
};

type ExpensesData = {
  categories: ExpenseCategory[];
  subcategories: ExpenseSubcategory[];
  values: ExpenseValue[];
};

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Cores explícitas: o tema da DuKamp usa OKLCH nas variáveis CSS.
// Recharts recebia hsl(var(--primary)), o que gerava uma cor SVG inválida,
// escondia linhas/barras e fazia as fatias caírem no preto padrão do navegador.
const CHART_COLORS = [
  "#159447",
  "#2563EB",
  "#F59E0B",
  "#7C3AED",
  "#E11D48",
  "#0891B2",
  "#65A30D",
  "#EA580C",
];
const CURRENT_COLOR = "#159447";
const PREVIOUS_COLOR = "#94A3B8";
const GRID_COLOR = "#CBD5E1";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

const compactMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

function periodKey(year: number, month: number) {
  return year * 100 + month;
}

function periodLabel(key: number) {
  const year = Math.floor(key / 100);
  const month = key % 100;
  return `${MONTHS[month - 1]} ${year}`;
}

function previousPeriod(key: number) {
  const year = Math.floor(key / 100);
  const month = key % 100;
  return month === 1 ? (year - 1) * 100 + 12 : year * 100 + month - 1;
}

async function loadExpensesData(): Promise<ExpensesData> {
  const [categoriesResult, subcategoriesResult, valuesResult] = await Promise.all([
    (supabase as any)
      .from("dukamp_expense_categories")
      .select("code,name,sort_order")
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("dukamp_expense_subcategories")
      .select("code,category_code,name,sort_order")
      .order("sort_order", { ascending: true }),
    (supabase as any)
      .from("dukamp_expense_monthly_values")
      .select("year,month,subcategory_code,amount")
      .order("year", { ascending: true })
      .order("month", { ascending: true }),
  ]);

  const error = categoriesResult.error || subcategoriesResult.error || valuesResult.error;
  if (error) throw error;

  return {
    categories: (categoriesResult.data ?? []).map((row: any) => ({
      code: Number(row.code),
      name: String(row.name),
      sort_order: Number(row.sort_order ?? 0),
    })),
    subcategories: (subcategoriesResult.data ?? []).map((row: any) => ({
      code: Number(row.code),
      category_code: Number(row.category_code),
      name: String(row.name),
      sort_order: Number(row.sort_order ?? 0),
    })),
    values: (valuesResult.data ?? []).map((row: any) => ({
      year: Number(row.year),
      month: Number(row.month),
      subcategory_code: Number(row.subcategory_code),
      amount: Number(row.amount ?? 0),
    })),
  };
}

function ExpensesSidebar({
  data,
  selectedCategory,
  selectedSubcategory,
  onSelectCategory,
  onSelectSubcategory,
  onNavigate,
}: {
  data: ExpensesData;
  selectedCategory: number | null;
  selectedSubcategory: number | null;
  onSelectCategory: (code: number | null) => void;
  onSelectSubcategory: (categoryCode: number, subcategoryCode: number) => void;
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");

  const visibleCategories = useMemo(() => {
    if (!normalizedQuery) return data.categories;
    return data.categories.filter((category) => {
      if (category.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery)) return true;
      return data.subcategories.some(
        (subcategory) =>
          subcategory.category_code === category.code &&
          subcategory.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
      );
    });
  }, [data.categories, data.subcategories, normalizedQuery]);

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="border-b px-4 py-4">
        <Link
          to="/admin"
          onClick={onNavigate}
          className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao painel
        </Link>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <WalletCards className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold leading-tight">Despesas DuKamp</p>
            <p className="text-[11px] text-muted-foreground">Financeiro · 2026</p>
          </div>
        </div>
      </div>

      <div className="border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar categoria..."
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <button
          onClick={() => {
            onSelectCategory(null);
            onNavigate?.();
          }}
          className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            selectedCategory == null ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          Visão geral
        </button>

        <div className="my-3 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Categorias da planilha
        </div>

        {visibleCategories.map((category) => {
          const children = data.subcategories.filter((item) => item.category_code === category.code);
          const isActive = selectedCategory === category.code;
          const matchingChildren = normalizedQuery
            ? children.filter((item) => item.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery))
            : children;

          return (
            <details key={category.code} open={isActive || Boolean(normalizedQuery)} className="group mb-1">
              <summary
                onClick={() => onSelectCategory(category.code)}
                className={`flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive && selectedSubcategory == null ? "bg-accent font-semibold" : "hover:bg-accent/70"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate" title={category.name}>
                  {category.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
              </summary>

              <div className="ml-4 mt-1 space-y-0.5 border-l pl-2">
                <button
                  onClick={() => {
                    onSelectCategory(category.code);
                    onNavigate?.();
                  }}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                    isActive && selectedSubcategory == null
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  Todas da categoria
                </button>
                {matchingChildren.map((subcategory) => (
                  <button
                    key={subcategory.code}
                    onClick={() => {
                      onSelectSubcategory(category.code, subcategory.code);
                      onNavigate?.();
                    }}
                    title={subcategory.name}
                    className={`w-full rounded-md px-2 py-1.5 text-left text-xs ${
                      selectedSubcategory === subcategory.code
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <span className="line-clamp-2">{subcategory.name}</span>
                  </button>
                ))}
              </div>
            </details>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3 text-[10px] text-muted-foreground">
        Base privada · DESPESAS DUKAMP - 2026.xlsx
      </div>
    </div>
  );
}

function DukampExpensesPage() {
  const { isMasterAdmin, loading: authLoading } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const expenses = useQuery({
    queryKey: ["admin", "dukamp-expenses"],
    queryFn: loadExpensesData,
    enabled: isMasterAdmin,
    staleTime: 5 * 60_000,
  });

  const data = expenses.data ?? { categories: [], subcategories: [], values: [] };

  const computed = useMemo(() => {
    const subcategoryByCode = new Map(data.subcategories.map((item) => [item.code, item]));
    const categoryByCode = new Map(data.categories.map((item) => [item.code, item]));
    const periods = Array.from(
      new Set(data.values.map((item) => periodKey(item.year, item.month))),
    ).sort((a, b) => a - b);
    const latestPeriod = periods.at(-1) ?? 202601;
    const activePeriod = selectedPeriod && periods.includes(selectedPeriod) ? selectedPeriod : latestPeriod;
    const previous = previousPeriod(activePeriod);

    const scopeValues = data.values.filter((item) => {
      if (selectedSubcategory != null) return item.subcategory_code === selectedSubcategory;
      if (selectedCategory == null) return true;
      return subcategoryByCode.get(item.subcategory_code)?.category_code === selectedCategory;
    });

    const monthlyTrend = periods.map((key) => ({
      key,
      period: periodLabel(key).replace(" 2026", ""),
      total: scopeValues
        .filter((item) => periodKey(item.year, item.month) === key)
        .reduce((sum, item) => sum + item.amount, 0),
    }));
    const monthsWithValues = monthlyTrend.filter((item) => item.total !== 0).length;
    const hasTrendData = monthsWithValues > 0;

    const currentValues = scopeValues.filter((item) => periodKey(item.year, item.month) === activePeriod);
    const previousValues = scopeValues.filter((item) => periodKey(item.year, item.month) === previous);
    const currentTotal = currentValues.reduce((sum, item) => sum + item.amount, 0);
    const previousTotal = previousValues.reduce((sum, item) => sum + item.amount, 0);
    const change = previousTotal !== 0 ? ((currentTotal - previousTotal) / Math.abs(previousTotal)) * 100 : null;
    const average = monthsWithValues
      ? monthlyTrend.reduce((sum, item) => sum + item.total, 0) / monthsWithValues
      : 0;

    const groupCurrent = new Map<number, number>();
    const groupPrevious = new Map<number, number>();
    for (const item of currentValues) {
      const sub = subcategoryByCode.get(item.subcategory_code);
      if (!sub) continue;
      const groupCode = selectedCategory == null ? sub.category_code : sub.code;
      groupCurrent.set(groupCode, (groupCurrent.get(groupCode) ?? 0) + item.amount);
    }
    for (const item of previousValues) {
      const sub = subcategoryByCode.get(item.subcategory_code);
      if (!sub) continue;
      const groupCode = selectedCategory == null ? sub.category_code : sub.code;
      groupPrevious.set(groupCode, (groupPrevious.get(groupCode) ?? 0) + item.amount);
    }

    const nameForGroup = (code: number) =>
      selectedCategory == null
        ? categoryByCode.get(code)?.name ?? String(code)
        : subcategoryByCode.get(code)?.name ?? String(code);

    const breakdown = Array.from(groupCurrent.entries())
      .filter(([, total]) => total !== 0)
      .map(([code, total]) => ({
        code,
        name: nameForGroup(code),
        total,
        previous: groupPrevious.get(code) ?? 0,
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const comparisonCodes = Array.from(
      new Set([...groupCurrent.keys(), ...groupPrevious.keys()]),
    );
    const comparison = comparisonCodes
      .map((code) => ({
        name: nameForGroup(code),
        atual: groupCurrent.get(code) ?? 0,
        anterior: groupPrevious.get(code) ?? 0,
      }))
      .filter((item) => item.atual !== 0 || item.anterior !== 0)
      .sort((a, b) => Math.abs(b.atual) - Math.abs(a.atual))
      .slice(0, 10)
      .map((item) => ({
        ...item,
        name: item.name.length > 22 ? `${item.name.slice(0, 22)}…` : item.name,
      }));

    const detailRows = currentValues
      .map((item) => {
        const sub = subcategoryByCode.get(item.subcategory_code);
        const category = sub ? categoryByCode.get(sub.category_code) : undefined;
        return {
          code: item.subcategory_code,
          subcategory: sub?.name ?? String(item.subcategory_code),
          category: category?.name ?? "—",
          amount: item.amount,
        };
      })
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    const top = breakdown[0];
    const selectedCategoryName = selectedCategory
      ? categoryByCode.get(selectedCategory)?.name
      : undefined;
    const selectedSubcategoryName = selectedSubcategory
      ? subcategoryByCode.get(selectedSubcategory)?.name
      : undefined;

    return {
      periods,
      activePeriod,
      previous,
      monthlyTrend,
      monthsWithValues,
      hasTrendData,
      currentTotal,
      previousTotal,
      change,
      average,
      breakdown,
      comparison,
      detailRows,
      top,
      selectedCategoryName,
      selectedSubcategoryName,
    };
  }, [data, selectedCategory, selectedSubcategory, selectedPeriod]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando...</div>;
  }

  if (!isMasterAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4 text-center">
        <div className="max-w-md rounded-2xl border bg-card p-8 shadow-sm">
          <WalletCards className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-bold">Área financeira restrita</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta área está disponível somente para a conta-mestre da DuKamp.
          </p>
          <Button asChild variant="outline" className="mt-5">
            <Link to="/admin">Voltar ao painel</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (expenses.isLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando despesas...</div>;
  }

  if (expenses.isError) {
    return (
      <div className="grid min-h-screen place-items-center bg-muted/30 px-4 text-center">
        <div className="max-w-md rounded-2xl border bg-card p-8 shadow-sm">
          <h1 className="text-xl font-bold">Não foi possível carregar as despesas</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A base financeira está protegida. Atualize a página ou confira a sessão da conta-mestre.
          </p>
          <Button className="mt-5" onClick={() => expenses.refetch()}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  const selectCategory = (code: number | null) => {
    setSelectedCategory(code);
    setSelectedSubcategory(null);
  };

  const sidebar = (
    <ExpensesSidebar
      data={data}
      selectedCategory={selectedCategory}
      selectedSubcategory={selectedSubcategory}
      onSelectCategory={selectCategory}
      onSelectSubcategory={(categoryCode, subcategoryCode) => {
        setSelectedCategory(categoryCode);
        setSelectedSubcategory(subcategoryCode);
      }}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  const activeFilterName =
    computed.selectedSubcategoryName ?? computed.selectedCategoryName ?? "o filtro selecionado";

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-72 shrink-0 border-r lg:block">{sidebar}</aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-3 backdrop-blur lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir categorias">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-80 p-0">
              {sidebar}
            </SheetContent>
          </Sheet>
          <WalletCards className="h-5 w-5 text-primary" />
          <span className="font-semibold">Despesas DuKamp</span>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Despesas DuKamp</span>
                {computed.selectedCategoryName && <span>› {computed.selectedCategoryName}</span>}
                {computed.selectedSubcategoryName && <span>› {computed.selectedSubcategoryName}</span>}
              </div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {computed.selectedSubcategoryName ?? computed.selectedCategoryName ?? "Visão geral financeira"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Leitura visual da planilha de despesas, com evolução mensal e comparação automática.
              </p>
            </div>

            <label className="flex min-w-52 flex-col gap-1.5 text-xs font-medium text-muted-foreground">
              Período analisado
              <select
                value={computed.activePeriod}
                onChange={(event) => setSelectedPeriod(Number(event.target.value))}
                className="h-10 rounded-lg border bg-background px-3 text-sm font-medium text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
              >
                {[...computed.periods].reverse().map((key) => (
                  <option key={key} value={key}>
                    {periodLabel(key)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CircleDollarSign className="h-4 w-4" />}
              label={`Total · ${periodLabel(computed.activePeriod)}`}
              value={money.format(computed.currentTotal)}
              helper="Soma do filtro selecionado"
            />
            <MetricCard
              icon={
                computed.change != null && computed.change <= 0 ? (
                  <TrendingDown className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )
              }
              label="Vs. mês anterior"
              value={computed.change == null ? "Sem base" : `${computed.change >= 0 ? "+" : ""}${computed.change.toFixed(1)}%`}
              helper={money.format(computed.previousTotal)}
              tone={computed.change != null && computed.change > 0 ? "warning" : "positive"}
            />
            <MetricCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Média mensal"
              value={money.format(computed.average)}
              helper={computed.monthsWithValues === 1 ? "1 mês com lançamento" : `${computed.monthsWithValues} meses com lançamentos`}
            />
            <MetricCard
              icon={<ArrowDownRight className="h-4 w-4" />}
              label={selectedCategory == null ? "Maior categoria" : "Maior subcategoria"}
              value={computed.top ? money.format(computed.top.total) : "—"}
              helper={computed.top?.name ?? "Sem lançamentos no período"}
            />
          </section>

          <section className="mt-4 grid gap-4 2xl:grid-cols-[1.35fr_1fr]">
            <Panel title="Evolução mensal" subtitle="Como o total do filtro se comportou ao longo de 2026">
              <div className="h-[310px] w-full">
                {computed.hasTrendData ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={computed.monthlyTrend} margin={{ top: 10, right: 12, left: 8, bottom: 0 }}>
                      <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} opacity={0.55} />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                      <Tooltip formatter={(value: any) => [money.format(Number(value)), "Despesas"]} />
                      <Line
                        type="monotone"
                        dataKey="total"
                        name="Despesas"
                        stroke={CURRENT_COLOR}
                        strokeWidth={3}
                        connectNulls
                        dot={{ r: 4, fill: CURRENT_COLOR, stroke: "#FFFFFF", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: CURRENT_COLOR, stroke: "#FFFFFF", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState
                    title="Sem lançamentos para exibir"
                    description={`Não há valores registrados em 2026 para ${activeFilterName}.`}
                  />
                )}
              </div>
            </Panel>

            <Panel
              title={selectedCategory == null ? "Distribuição por categoria" : "Distribuição por subcategoria"}
              subtitle={periodLabel(computed.activePeriod)}
            >
              <div className="h-[310px] w-full">
                {computed.breakdown.length > 0 && computed.currentTotal !== 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={computed.breakdown.slice(0, 8)}
                        dataKey="total"
                        nameKey="name"
                        innerRadius="54%"
                        outerRadius="82%"
                        paddingAngle={2}
                      >
                        {computed.breakdown.slice(0, 8).map((entry, index) => (
                          <Cell
                            key={entry.code}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any, name: any) => [money.format(Number(value)), String(name)]} />
                      <Legend
                        iconType="circle"
                        formatter={(value) =>
                          String(value).length > 25 ? `${String(value).slice(0, 25)}…` : value
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState
                    title={`Sem lançamentos em ${periodLabel(computed.activePeriod)}`}
                    description={`Este filtro está zerado no período selecionado. A evolução mensal continua mostrando os meses em que houve valor.`}
                  />
                )}
              </div>
            </Panel>
          </section>

          <section className="mt-4">
            <Panel
              title="Comparação com o mês anterior"
              subtitle={`${periodLabel(computed.previous)} × ${periodLabel(computed.activePeriod)} · maiores itens do período`}
            >
              <div className="h-[360px] w-full">
                {computed.comparison.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={computed.comparison} margin={{ top: 10, right: 12, left: 8, bottom: 70 }}>
                      <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} opacity={0.55} />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(value) => compactMoney.format(Number(value))} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={72} />
                      <Tooltip formatter={(value: any) => money.format(Number(value))} />
                      <Legend />
                      <Bar dataKey="anterior" name="Mês anterior" fill={PREVIOUS_COLOR} radius={[5, 5, 0, 0]} />
                      <Bar dataKey="atual" name="Período atual" fill={CURRENT_COLOR} radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChartState
                    title="Sem valores para comparar"
                    description={`Não há lançamentos em ${periodLabel(computed.previous)} nem em ${periodLabel(computed.activePeriod)} para este filtro.`}
                  />
                )}
              </div>
            </Panel>
          </section>

          <section className="mt-4">
            <Panel title="Detalhamento do período" subtitle="Subcategorias ordenadas do maior para o menor valor">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-2 py-3 font-medium">Código</th>
                      <th className="px-2 py-3 font-medium">Subcategoria</th>
                      <th className="px-2 py-3 font-medium">Categoria</th>
                      <th className="px-2 py-3 text-right font-medium">Valor</th>
                      <th className="px-2 py-3 text-right font-medium">% do período</th>
                    </tr>
                  </thead>
                  <tbody>
                    {computed.detailRows.map((row) => (
                      <tr key={row.code} className="border-b last:border-0 hover:bg-muted/40">
                        <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{row.code}</td>
                        <td className="px-2 py-3 font-medium">{row.subcategory}</td>
                        <td className="px-2 py-3 text-muted-foreground">{row.category}</td>
                        <td className="px-2 py-3 text-right font-semibold tabular-nums">{money.format(row.amount)}</td>
                        <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                          {computed.currentTotal !== 0
                            ? `${((row.amount / computed.currentTotal) * 100).toFixed(1)}%`
                            : "0,0%"}
                        </td>
                      </tr>
                    ))}
                    {computed.detailRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-10 text-center text-muted-foreground">
                          Não há valores para este filtro no período selecionado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone = "neutral",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "positive"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-muted text-foreground">{icon}</span>
        <span className="line-clamp-1">{label}</span>
      </div>
      <div className={`text-2xl font-bold tracking-tight tabular-nums ${toneClass}`}>{value}</div>
      <p className="mt-1 line-clamp-2 min-h-8 text-xs text-muted-foreground">{helper}</p>
    </div>
  );
}

function EmptyChartState({ title, description }: { title: string; description: string }) {
  return (
    <div className="grid h-full place-items-center px-6 text-center">
      <div className="max-w-sm">
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl bg-muted text-muted-foreground">
          <BarChart3 className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}
