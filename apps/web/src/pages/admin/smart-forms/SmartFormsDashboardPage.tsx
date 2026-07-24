import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminButton } from "../../../components/admin/ui";
import { useSession } from "../../../lib/session-context";

export function SmartFormsDashboardPage() {
  const { workspace, can } = useSession();
  const [totals, setTotals] = useState({
    visitors: 0,
    started: 0,
    completed: 0,
    abandoned: 0,
    qualified: 0,
    disqualified: 0,
  });
  const [formsTotal, setFormsTotal] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);

  const canReadForms = can("forms.read");
  const canReadLeads = can("leads.read");

  useEffect(() => {
    if (!canReadForms) return;
    void (async () => {
      try {
        const [dash, forms, leads] = await Promise.all([
          smartFormsApi.dashboard(),
          smartFormsApi.list({ pageSize: "1" }),
          canReadLeads ? smartFormsApi.leads({ pageSize: "1" }) : Promise.resolve({ total: 0 }),
        ]);
        setTotals({
          visitors: Number(dash.totals.visitors || 0),
          started: Number(dash.totals.started || 0),
          completed: Number(dash.totals.completed || 0),
          abandoned: Number(dash.totals.abandoned || 0),
          qualified: Number(dash.totals.qualified || 0),
          disqualified: Number(dash.totals.disqualified || 0),
        });
        setFormsTotal(forms.total);
        setLeadsTotal(leads.total);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro no dashboard");
      }
    })();
  }, [canReadForms, canReadLeads, workspace?.id]);

  const conv =
    totals.started > 0 ? Math.round((totals.completed / totals.started) * 100) : 0;

  const cards = [
    { label: "Formulários", value: formsTotal },
    { label: "Leads", value: leadsTotal },
    { label: "Sessões", value: totals.started },
    { label: "Concluídos", value: totals.completed },
    { label: "Qualificados", value: totals.qualified },
    { label: "Conv. %", value: `${conv}%` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace ? `${workspace.name} · ` : ""}visão geral dos formulários inteligentes
            (últimos 30 dias).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FormsModuleNav />
          {canReadForms && (
            <Link to="/admin/forms">
              <AdminButton>Meus formulários</AdminButton>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-border/60 bg-white p-4 shadow-[var(--shadow-surface-sm)]"
          >
            <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)]">
          <h2 className="text-[15px] font-bold">Funil</h2>
          <ul className="mt-4 space-y-2 text-sm">
            <Row label="Visitantes" value={totals.visitors} />
            <Row label="Iniciaram" value={totals.started} />
            <Row label="Concluíram" value={totals.completed} />
            <Row label="Abandonaram" value={totals.abandoned} />
            <Row label="Qualificados (HOT+)" value={totals.qualified} />
            <Row label="Frios" value={totals.disqualified} />
          </ul>
        </section>
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)]">
          <h2 className="text-[15px] font-bold">Atalhos</h2>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              to="/admin/forms/templates"
              className="rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:border-primary/40"
            >
              Usar um template
            </Link>
            <Link
              to="/admin/forms/leads"
              className="rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:border-primary/40"
            >
              Ver leads capturados
            </Link>
            <Link
              to="/admin/forms/config"
              className="rounded-xl border border-border/60 px-4 py-3 text-sm font-medium hover:border-primary/40"
            >
              Checklist de configuração
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <li className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}
