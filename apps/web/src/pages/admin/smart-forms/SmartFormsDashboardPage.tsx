import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ClipboardList,
  FileText,
  Flame,
  LayoutTemplate,
  MessageSquareText,
  Plus,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import type { SmartFormRecord } from "../../../lib/smart-forms/types";
import { PageHeaderPremium } from "../../../components/admin/PageHeaderPremium";
import { AdminBadge, AdminButton } from "../../../components/admin/ui";
import { useSession } from "../../../lib/session-context";

type DayPoint = {
  day: string;
  visitors: number;
  started: number;
  completed: number;
};

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  temperature: string | null;
  formName: string | null;
  createdAt: string | null;
};

const EMPTY_TOTALS = {
  visitors: 0,
  started: 0,
  completed: 0,
  abandoned: 0,
  qualified: 0,
  disqualified: 0,
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function fmtDay(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  } catch {
    return iso;
  }
}

function fmtRelative(iso: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `há ${hrs} h`;
    const days = Math.round(hrs / 24);
    if (days < 30) return `há ${days} d`;
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "—";
  }
}

function tempTone(t: string | null): "danger" | "warn" | "neutral" | "live" {
  const v = (t || "").toUpperCase();
  if (v === "HOT" || v === "QUENTE") return "danger";
  if (v === "WARM" || v === "MORNO") return "warn";
  if (v === "COLD" || v === "FRIO") return "neutral";
  return "live";
}

const PERIODS = [
  { id: "7", label: "7 dias", days: 7 },
  { id: "30", label: "30 dias", days: 30 },
  { id: "90", label: "90 dias", days: 90 },
] as const;

type PeriodId = (typeof PERIODS)[number]["id"];

export function SmartFormsDashboardPage() {
  const { workspace, can } = useSession();
  const [period, setPeriod] = useState<PeriodId>("30");
  const [totals, setTotals] = useState(EMPTY_TOTALS);
  const [series, setSeries] = useState<DayPoint[]>([]);
  const [formsTotal, setFormsTotal] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [recentForms, setRecentForms] = useState<SmartFormRecord[]>([]);
  const [recentLeads, setRecentLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const canReadForms = can("forms.read");
  const canReadLeads = can("leads.read");
  const canWrite = can("forms.write");
  const periodDays = PERIODS.find((p) => p.id === period)?.days ?? 30;

  useEffect(() => {
    if (!canReadForms) return;
    let alive = true;
    setLoading(true);
    void (async () => {
      try {
        const from = new Date(Date.now() - periodDays * 86400000).toISOString();
        const to = new Date().toISOString();
        const [dash, forms, leads] = await Promise.all([
          smartFormsApi.dashboard({ from, to }),
          smartFormsApi.list({ pageSize: "5" }),
          canReadLeads
            ? smartFormsApi.leads({ pageSize: "6" })
            : Promise.resolve({ total: 0, items: [] as Array<Record<string, unknown>> }),
        ]);
        if (!alive) return;
        setTotals({
          visitors: num(dash.totals.visitors),
          started: num(dash.totals.started),
          completed: num(dash.totals.completed),
          abandoned: num(dash.totals.abandoned),
          qualified: num(dash.totals.qualified),
          disqualified: num(dash.totals.disqualified),
        });
        setSeries(
          (dash.series || []).map((r) => ({
            day: str(r.day) || "",
            visitors: num(r.visitors),
            started: num(r.started),
            completed: num(r.completed),
          }))
        );
        setFormsTotal(forms.total);
        setRecentForms(forms.items || []);
        setLeadsTotal(num((leads as { total?: number }).total));
        setRecentLeads(
          ((leads as { items?: Array<Record<string, unknown>> }).items || []).map(
            (l) => ({
              id: str(l.id) || "",
              name: str(l.name) || str(l.fullName) || "Lead sem nome",
              email: str(l.email),
              temperature: str(l.temperature),
              formName:
                str((l.form as Record<string, unknown> | undefined)?.name) ||
                str(l.formName),
              createdAt: str(l.createdAt),
            })
          )
        );
      } catch (e) {
        if (alive) toast.error(e instanceof Error ? e.message : "Erro no dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [canReadForms, canReadLeads, workspace?.id, periodDays]);

  const conv =
    totals.started > 0 ? Math.round((totals.completed / totals.started) * 100) : 0;
  const startRate =
    totals.visitors > 0 ? Math.round((totals.started / totals.visitors) * 100) : 0;

  const chartMax = useMemo(
    () => Math.max(1, ...series.map((d) => Math.max(d.started, d.visitors))),
    [series]
  );
  const hasActivity = series.some(
    (d) => d.visitors || d.started || d.completed
  );

  const kpis = [
    {
      label: "Leads capturados",
      value: leadsTotal,
      icon: Users,
      accent: "text-primary",
      ring: "bg-primary/12",
    },
    {
      label: "Taxa de conversão",
      value: `${conv}%`,
      icon: TrendingUp,
      accent: "text-success",
      ring: "bg-success/12",
    },
    {
      label: "Sessões iniciadas",
      value: totals.started,
      icon: MessageSquareText,
      accent: "text-foreground",
      ring: "bg-muted",
    },
    {
      label: "Qualificados",
      value: totals.qualified,
      icon: Flame,
      accent: "text-warning",
      ring: "bg-warning/12",
    },
  ];

  const funnel = [
    { label: "Visitantes", value: totals.visitors, tone: "bg-muted-foreground/40" },
    { label: "Iniciaram", value: totals.started, tone: "bg-primary/60" },
    { label: "Concluíram", value: totals.completed, tone: "bg-primary" },
    { label: "Qualificados", value: totals.qualified, tone: "bg-success" },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="space-y-6">
      <PageHeaderPremium
        eyebrow=""
        title="Dashboard"
        showModuleNav={false}
        actions={
          <>
            <div className="inline-flex rounded-full border border-border/70 bg-card p-0.5 shadow-[var(--shadow-surface-sm)]">
              {PERIODS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    period === p.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {canReadForms && (
              <Link to="/admin/forms">
                <AdminButton variant="ghost">
                  <FileText className="mr-1.5 h-4 w-4" />
                  Formulários
                </AdminButton>
              </Link>
            )}
            {canWrite && (
              <Link to="/admin/forms/templates">
                <AdminButton>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo formulário
                </AdminButton>
              </Link>
            )}
          </>
        }
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex items-center gap-4 rounded-[var(--radius)] border border-border/70 bg-card p-4 shadow-[var(--shadow-surface-sm)]"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${k.ring} ${k.accent}`}
            >
              <k.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {k.label}
              </div>
              <div className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-foreground">
                {loading ? "—" : k.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Atividade (gráfico) */}
        <section className="rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-[var(--shadow-surface-sm)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold text-foreground">Atividade</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sessões iniciadas por dia (últimos {periodDays} dias)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/40" />
                Iniciaram
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Concluíram
              </span>
            </div>
          </div>

          {hasActivity ? (
            <div className="mt-5 flex h-40 items-end gap-1">
              {series.map((d, i) => {
                const startedH = Math.round((d.started / chartMax) * 100);
                const completedH = Math.round((d.completed / chartMax) * 100);
                return (
                  <div
                    key={`${d.day}-${i}`}
                    className="group relative flex flex-1 items-end justify-center"
                    title={`${fmtDay(d.day)} · ${d.started} iniciaram, ${d.completed} concluíram`}
                  >
                    <div className="relative flex h-full w-full max-w-[14px] items-end justify-center">
                      <div
                        className="w-full rounded-t bg-primary/25 transition group-hover:bg-primary/40"
                        style={{ height: `${Math.max(startedH, 2)}%` }}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t bg-primary transition"
                        style={{ height: `${Math.max(completedH, d.completed ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 flex h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 text-center">
              <p className="text-sm font-medium text-foreground">Sem atividade ainda</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Publique um formulário e compartilhe o link para começar a ver dados aqui.
              </p>
            </div>
          )}
        </section>

        {/* Funil */}
        <section className="rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-[var(--shadow-surface-sm)]">
          <h2 className="text-[15px] font-bold text-foreground">Funil de conversão</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {startRate}% dos visitantes iniciam · {conv}% concluem
          </p>
          <div className="mt-5 space-y-3.5">
            {funnel.map((f) => {
              const pct = Math.round((f.value / funnelMax) * 100);
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">{f.label}</span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {f.value}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${f.tone} transition-all`}
                      style={{ width: `${Math.max(pct, f.value ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {totals.abandoned > 0 && (
            <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              {totals.abandoned} sessões abandonadas no período.
            </p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Formulários recentes */}
        <section className="rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-[var(--shadow-surface-sm)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">
              Formulários {formsTotal ? `(${formsTotal})` : ""}
            </h2>
            <Link
              to="/admin/forms"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Ver todos
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {loading && recentForms.length === 0 ? (
              <SkeletonRows />
            ) : recentForms.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nenhum formulário ainda"
                cta={canWrite ? { to: "/admin/forms/templates", label: "Usar um template" } : undefined}
              />
            ) : (
              recentForms.map((f) => (
                <Link
                  key={f.id}
                  to={`/admin/forms/${f.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-3 transition hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {f.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {f._count?.leads ?? 0} leads · {f._count?.sessions ?? 0} sessões
                    </div>
                  </div>
                  <AdminBadge
                    tone={
                      f.status === "PUBLISHED"
                        ? "live"
                        : f.status === "DRAFT"
                          ? "warn"
                          : "neutral"
                    }
                  >
                    {f.status === "PUBLISHED"
                      ? "Publicado"
                      : f.status === "DRAFT"
                        ? "Rascunho"
                        : "Arquivado"}
                  </AdminBadge>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Leads recentes */}
        <section className="rounded-[var(--radius)] border border-border/70 bg-card p-5 shadow-[var(--shadow-surface-sm)]">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">Leads recentes</h2>
            {canReadLeads && (
              <Link
                to="/admin/forms/leads"
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Ver todos
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {!canReadLeads ? (
              <EmptyState icon={Users} title="Sem acesso aos leads" />
            ) : loading && recentLeads.length === 0 ? (
              <SkeletonRows />
            ) : recentLeads.length === 0 ? (
              <EmptyState icon={Users} title="Nenhum lead capturado ainda" />
            ) : (
              recentLeads.map((l) => (
                <Link
                  key={l.id}
                  to={`/admin/forms/leads?lead=${l.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3.5 py-3 transition hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">
                      {l.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {l.email || l.formName || "—"}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {l.temperature && (
                      <AdminBadge tone={tempTone(l.temperature)}>
                        {l.temperature}
                      </AdminBadge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {fmtRelative(l.createdAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Atalhos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ShortcutCard
          to="/admin/forms/templates"
          icon={LayoutTemplate}
          title="Usar um template"
          desc="Comece a partir de um modelo pronto."
        />
        <ShortcutCard
          to="/admin/forms/leads"
          icon={Users}
          title="Ver leads capturados"
          desc="Contatos, respostas e qualificação."
        />
        <ShortcutCard
          to="/admin/forms/config"
          icon={ClipboardList}
          title="Configuração"
          desc="Domínios, pixels e integrações."
        />
      </div>
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof Users;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-[var(--radius)] border border-border/70 bg-card p-4 shadow-[var(--shadow-surface-sm)] transition hover:border-primary/40 hover:bg-accent/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}

function EmptyState({
  icon: Icon,
  title,
  cta,
}: {
  icon: typeof Users;
  title: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
      <Icon className="h-6 w-6 text-muted-foreground/60" />
      <p className="mt-2 text-sm font-medium text-foreground">{title}</p>
      {cta && (
        <Link
          to={cta.to}
          className="mt-3 text-xs font-semibold text-primary hover:underline"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[52px] animate-pulse rounded-xl border border-border/60 bg-muted/40"
        />
      ))}
    </>
  );
}
