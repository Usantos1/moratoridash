import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

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
    return <div className="text-white/50">Carregando lead…</div>;
  }

  const logs = (lead.deliveryLogs as Array<Record<string, unknown>>) || [];

  return (
    <div className="space-y-6">
      <Link to="/admin" className="text-sm text-white/50 hover:text-white">
        ← Voltar
      </Link>
      <div>
        <h1 className="font-display text-3xl font-extrabold">{String(lead.name)}</h1>
        <p className="mt-1 text-white/55">{String(lead.companyName)}</p>
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
          <div key={String(k)} className="border border-white/10 bg-[#0e1614] p-4">
            <div className="text-xs uppercase tracking-wide text-white/40">{String(k)}</div>
            <div className="mt-1 break-all text-sm">{String(v ?? "—")}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Nichos</h2>
        <p className="mt-2 text-sm text-white/70">
          {Array.isArray(lead.niches) ? (lead.niches as string[]).join(", ") : "—"}
        </p>
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Entregas</h2>
        <div className="mt-3 space-y-2">
          {logs.length === 0 && <p className="text-sm text-white/45">Nenhuma entrega registrada.</p>}
          {logs.map((log) => (
            <div key={String(log.id)} className="border border-white/10 bg-[#0e1614] px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {String(log.destination)} · {String(log.eventName)}
                </span>
                <span className="text-xs uppercase text-white/45">{String(log.status)}</span>
              </div>
              {log.lastError ? (
                <div className="mt-1 text-xs text-rose-300">{String(log.lastError)}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {["contacted", "qualified", "converted", "rejected"].map((status) => (
          <button
            key={status}
            type="button"
            className="border border-white/15 px-3 py-2 text-xs uppercase tracking-wide hover:border-[var(--leaf)]"
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
          </button>
        ))}
      </div>
    </div>
  );
}
