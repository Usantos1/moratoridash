import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminBadge,
  AdminButton,
  AdminPageHeader,
  AdminPanel,
} from "../../components/admin/ui";

export function AdminLeadDetailPage() {
  const { id } = useParams();
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!id) return;
    adminApi
      .lead(id)
      .then(setLead)
      .catch((e) => toast.error(e.message));
  }, [id]);

  if (!lead) {
    return <div className="anim-rise text-muted-foreground">Carregando lead…</div>;
  }

  const logs = (lead.deliveryLogs as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-8">
      <div>
        <Link
          to="/admin"
          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground hover:text-primary"
        >
          ← Voltar aos leads
        </Link>
        <AdminPageHeader
          title={String(lead.name)}
          description={String(lead.companyName)}
          actions={
            lead.isQualified ? (
              <AdminBadge tone="success">Qualificado</AdminBadge>
            ) : (
              <AdminBadge>Em acompanhamento</AdminBadge>
            )
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          ["E-mail", lead.email],
          ["WhatsApp", lead.phone],
          ["Time", lead.numberOfAttendants],
          ["Leads/dia", lead.clientsPerDay],
          ["Faturamento", lead.revenueLevel],
          ["Resposta", lead.responseTime],
          ["Qualificado", lead.isQualified ? "Sim" : "Não"],
          ["Status", lead.status],
          ["UTM Source", lead.utmSource || "—"],
          ["Campanha", lead.utmCampaign || "—"],
          ["Página", lead.sourcePage || "—"],
        ].map(([k, v]) => (
          <div
            key={String(k)}
            className="rounded-[var(--radius)] border border-border/70 bg-card px-4 py-3.5 shadow-[var(--shadow-surface-sm)]"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {String(k)}
            </div>
            <div className="mt-1.5 break-all text-sm text-foreground">{String(v ?? "—")}</div>
          </div>
        ))}
      </div>

      <AdminPanel title="Nichos">
        <p className="text-sm text-muted-foreground">
          {Array.isArray(lead.niches) ? (lead.niches as string[]).join(", ") : "—"}
        </p>
      </AdminPanel>

      <AdminPanel title="Entregas">
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma entrega registrada.</p>}
          {logs.map((log) => (
            <div
              key={String(log.id)}
              className="flex flex-wrap items-center justify-between gap-2 rounded-[calc(var(--radius)-2px)] border border-border/60 bg-muted/30 px-4 py-3 text-sm"
            >
              <span>
                {String(log.destination)} · {String(log.eventName)}
              </span>
              <AdminBadge>{String(log.status)}</AdminBadge>
              {log.lastError ? (
                <div className="w-full text-xs text-rose-300">{String(log.lastError)}</div>
              ) : null}
            </div>
          ))}
        </div>
      </AdminPanel>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Atualizar status
        </p>
        <div className="flex flex-wrap gap-2">
          {["contacted", "qualified", "converted", "rejected"].map((status) => (
            <AdminButton
              key={status}
              variant="ghost"
              className="!py-2 text-xs uppercase tracking-wide"
              onClick={async () => {
                try {
                  await adminApi.setLeadStatus(String(lead.id), status);
                  toast.success("Status atualizado");
                  setLead(await adminApi.lead(String(lead.id)));
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro");
                }
              }}
            >
              {status}
            </AdminButton>
          ))}
        </div>
      </div>
    </div>
  );
}
