import { useEffect, useState } from "react";
import { Download, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken } from "../../../lib/admin-api";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminBadge, AdminButton, AdminInput } from "../../../components/admin/ui";

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
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { pageSize: "50" };
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
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Excluir este lead?")) return;
    try {
      await smartFormsApi.deleteLead(id);
      toast.success("Lead excluído");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  async function exportCsv() {
    try {
      const token = getAdminToken();
      const res = await fetch(smartFormsApi.exportLeadsUrl(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Falha no export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "smart-form-leads.csv";
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
            {total} lead{total === 1 ? "" : "s"} capturados pelos formulários
          </p>
        </div>
        <FormsModuleNav />
      </div>

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
        <AdminButton variant="ghost" onClick={() => void exportCsv()}>
          <Download className="mr-1 h-4 w-4" />
          Exportar CSV
        </AdminButton>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[var(--shadow-surface-sm)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-border/50 bg-muted/30 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Formulário</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Temperatura</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-muted-foreground">
                    Nenhum lead ainda.
                  </td>
                </tr>
              ) : (
                items.map((lead) => {
                  const form = lead.form as { name?: string } | undefined;
                  const name =
                    (lead.fullName as string) ||
                    (lead.email as string) ||
                    (lead.phone as string) ||
                    "—";
                  return (
                    <tr key={String(lead.id)} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground">
                          {(lead.phone as string) || (lead.email as string) || "—"}
                        </div>
                        <AdminBadge tone="warn" >
                          {statusLabel(String(lead.status))}
                        </AdminBadge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {form?.name || "—"}
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
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => void remove(String(lead.id))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
