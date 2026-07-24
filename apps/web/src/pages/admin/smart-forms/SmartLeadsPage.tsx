import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken } from "../../../lib/admin-api";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import type { SmartFormRecord } from "../../../lib/smart-forms/types";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { SmartLeadModal } from "../../../components/admin/SmartLeadModal";
import { AdminBadge, AdminButton, AdminInput } from "../../../components/admin/ui";
import { useCan } from "../../../lib/session-context";

function tempTone(t: string): "neutral" | "warn" | "live" | "danger" {
  if (t === "COLD") return "neutral";
  if (t === "WARM") return "warn";
  if (t === "HOT" || t === "VERY_HOT") return "live";
  return "neutral";
}

function tempLabel(t: string) {
  const map: Record<string, string> = {
    COLD: "Frio",
    WARM: "Morno",
    HOT: "Quente",
    VERY_HOT: "Muito quente",
  };
  return map[t] || t;
}

function statusLabel(s: string) {
  const map: Record<string, string> = {
    COMPLETED: "Concluído",
    IN_PROGRESS: "Em andamento",
    ABANDONED: "Abandonado",
    DISQUALIFIED: "Desqualificado",
  };
  return map[s] || s;
}

export function SmartLeadsPage() {
  const can = useCan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [forms, setForms] = useState<SmartFormRecord[]>([]);
  const [formId, setFormId] = useState<string>(searchParams.get("formId") || "");
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(
    searchParams.get("lead") || null
  );

  const selectedForm = useMemo(
    () => forms.find((f) => f.id === formId) ?? null,
    [forms, formId]
  );

  useEffect(() => {
    void smartFormsApi
      .list({ pageSize: "100" })
      .then((res) => {
        setForms(res.items);
        const fromUrl = searchParams.get("formId");
        const preferred =
          (fromUrl && res.items.find((f) => f.id === fromUrl)?.id) ||
          res.items.find((f) => (f._count?.leads ?? 0) > 0)?.id ||
          res.items[0]?.id ||
          "";
        setFormId((current) => current || preferred);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar formulários"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(nextFormId = formId) {
    if (!nextFormId) {
      setItems([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params: Record<string, string> = {
        pageSize: "50",
        formId: nextFormId,
      };
      if (q.trim()) params.q = q.trim();
      const res = await smartFormsApi.leads(params);
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!formId) return;
    const next = new URLSearchParams(searchParams);
    next.set("formId", formId);
    if (selectedLeadId) next.set("lead", selectedLeadId);
    else next.delete("lead");
    setSearchParams(next, { replace: true });
    void load(formId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId]);

  async function remove(id: string) {
    if (!confirm("Excluir este lead?")) return;
    try {
      await smartFormsApi.deleteLead(id);
      toast.success("Lead excluído");
      if (selectedLeadId === id) closeLead();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  function openLead(id: string) {
    setSelectedLeadId(id);
    const next = new URLSearchParams(searchParams);
    if (formId) next.set("formId", formId);
    next.set("lead", id);
    setSearchParams(next, { replace: true });
  }

  function closeLead() {
    setSelectedLeadId(null);
    const next = new URLSearchParams(searchParams);
    next.delete("lead");
    setSearchParams(next, { replace: true });
  }

  async function exportCsv() {
    try {
      const token = getAdminToken();
      const res = await fetch(smartFormsApi.exportLeadsUrl(formId || undefined), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Falha no export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedForm
        ? `leads-${selectedForm.slug || selectedForm.id}.csv`
        : "smart-form-leads.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no export");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedForm
              ? `${total} lead${total === 1 ? "" : "s"} em “${selectedForm.name}”`
              : "Selecione um formulário"}
          </p>
        </div>
        <FormsModuleNav />
      </div>

      {forms.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {forms.map((form) => {
            const active = form.id === formId;
            const count = form._count?.leads ?? 0;
            return (
              <button
                key={form.id}
                type="button"
                onClick={() => {
                  setFormId(form.id);
                  setSelectedLeadId(null);
                }}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/70 bg-white text-[#1d202b] hover:border-primary/35"
                }`}
              >
                <span className="max-w-[180px] truncate">{form.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                    active ? "bg-primary text-white" : "bg-[#f3f4f6] text-[#6b7280]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-white p-3 shadow-[var(--shadow-surface-sm)]">
        <AdminInput
          className="min-w-[220px] flex-1"
          placeholder="Buscar nome, e-mail ou telefone..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <AdminButton variant="ghost" onClick={() => void load()}>
          Buscar
        </AdminButton>
        <AdminButton variant="ghost" onClick={() => void load()} title="Atualizar">
          <RefreshCw className="h-4 w-4" />
        </AdminButton>
        {can("leads.export") && (
          <AdminButton variant="ghost" onClick={() => void exportCsv()} disabled={!formId}>
            <Download className="mr-1 h-4 w-4" />
            Exportar CSV
          </AdminButton>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[var(--shadow-surface-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/30 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Temperatura</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {!formId ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Nenhum formulário disponível.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                    Nenhum lead neste formulário.
                  </td>
                </tr>
              ) : (
                items.map((lead) => {
                  const name =
                    (lead.fullName as string) ||
                    (lead.email as string) ||
                    (lead.phone as string) ||
                    "—";
                  return (
                    <tr
                      key={String(lead.id)}
                      className="cursor-pointer border-b border-border/40 last:border-0 hover:bg-[#f8fafc]"
                      onClick={() => openLead(String(lead.id))}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(lead.phone as string) || (lead.email as string) || "—"}
                        </div>
                        <div className="mt-1">
                          <AdminBadge tone="warn">
                            {statusLabel(String(lead.status))}
                          </AdminBadge>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">
                        {String(lead.score ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        <AdminBadge tone={tempTone(String(lead.temperature))}>
                          {tempLabel(String(lead.temperature))}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>{(lead.utmSource as string) || "—"}</div>
                        {(lead.utmCampaign as string) && (
                          <div className="font-medium text-primary">
                            {String(lead.utmCampaign)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                        {lead.createdAt
                          ? new Date(String(lead.createdAt)).toLocaleString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {can("leads.delete") && (
                          <button
                            type="button"
                            className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => void remove(String(lead.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SmartLeadModal
        leadId={selectedLeadId}
        onClose={closeLead}
        onDeleted={() => void load()}
        onLoaded={({ formId: id }) => {
          if (id && id !== formId) setFormId(id);
        }}
        canDelete={can("leads.delete")}
      />
    </div>
  );
}
