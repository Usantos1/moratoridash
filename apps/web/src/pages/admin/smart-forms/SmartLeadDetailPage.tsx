import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminBadge, AdminButton } from "../../../components/admin/ui";

function tempLabel(t: string) {
  return (
    ({
      COLD: "Frio",
      WARM: "Morno",
      HOT: "Quente",
      VERY_HOT: "Muito quente",
    } as Record<string, string>)[t] || t
  );
}

export function SmartLeadDetailPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!leadId) return;
    void smartFormsApi
      .lead(leadId)
      .then(setLead)
      .catch((e) => toast.error(e.message));
  }, [leadId]);

  if (!lead) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-8 text-sm text-muted-foreground">
        Carregando lead…
      </div>
    );
  }

  const form = lead.form as { name?: string; publicSlug?: string } | undefined;
  const events = (lead.events as Array<Record<string, unknown>>) || [];
  const answerItems =
    (lead.answerItems as Array<{ nodeId: string; value: unknown }>) || [];
  const custom = (lead.customFields || {}) as Record<
    string,
    { label?: string; value?: unknown }
  >;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {(lead.fullName as string) ||
              (lead.email as string) ||
              (lead.phone as string) ||
              "Lead"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {form?.name || "Formulário"} · score {String(lead.score ?? 0)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <AdminBadge tone="live">{tempLabel(String(lead.temperature))}</AdminBadge>
            <AdminBadge>{String(lead.status)}</AdminBadge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FormsModuleNav />
          <Link to="/admin/forms/leads">
            <AdminButton variant="ghost">Voltar</AdminButton>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)]">
          <h2 className="text-[15px] font-bold">Contato</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Field label="Nome" value={lead.fullName} />
            <Field label="E-mail" value={lead.email} />
            <Field label="Telefone" value={lead.phone} />
            <Field label="Empresa" value={lead.companyName} />
            {Object.entries(custom).map(([k, v]) => (
              <Field key={k} label={v.label || k} value={v.value} />
            ))}
          </dl>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)]">
          <h2 className="text-[15px] font-bold">Origem</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Field label="UTM Source" value={lead.utmSource} />
            <Field label="UTM Campaign" value={lead.utmCampaign} />
            <Field label="UTM Medium" value={lead.utmMedium} />
            <Field label="gclid" value={lead.gclid} />
            <Field label="fbclid" value={lead.fbclid} />
            <Field label="Landing" value={lead.landingPage} />
            <Field label="Referrer" value={lead.referrer} />
          </dl>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] lg:col-span-2">
          <h2 className="text-[15px] font-bold">Respostas</h2>
          <div className="mt-3 divide-y divide-border/50">
            {answerItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem respostas.</p>
            ) : (
              answerItems.map((a) => (
                <div
                  key={a.nodeId}
                  className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm"
                >
                  <code className="text-xs text-muted-foreground">{a.nodeId}</code>
                  <span className="font-medium text-foreground">
                    {Array.isArray(a.value)
                      ? a.value.join(", ")
                      : a.value == null
                        ? "—"
                        : String(a.value)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {(lead.aiSummary as { text?: string } | null)?.text ? (
          <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] lg:col-span-2">
            <h2 className="text-[15px] font-bold">Resumo IA</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {String((lead.aiSummary as { text?: string }).text)}
            </p>
          </section>
        ) : null}

        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] lg:col-span-2">
          <h2 className="text-[15px] font-bold">Eventos</h2>
          <ul className="mt-3 space-y-2">
            {events.map((ev) => (
              <li
                key={String(ev.id)}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs"
              >
                <span>
                  <strong>{String(ev.eventType)}</strong> · {String(ev.eventName)}
                  {ev.nodeId ? ` · ${String(ev.nodeId)}` : ""}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {ev.createdAt
                    ? new Date(String(ev.createdAt)).toLocaleString("pt-BR")
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">
        {value == null || value === "" ? "—" : String(value)}
      </dd>
    </div>
  );
}
