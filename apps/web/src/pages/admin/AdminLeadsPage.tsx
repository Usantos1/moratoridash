import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminBadge,
  AdminButton,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
  AdminStat,
} from "../../components/admin/ui";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  revenueLevel: string | null;
  isQualified: boolean | null;
  status: string;
  completedAt: string | null;
  createdAt: string;
  utmSource: string | null;
  utmCampaign: string | null;
};

export function AdminLeadsPage() {
  const [stats, setStats] = useState({ total: 0, completed: 0, qualified: 0, today: 0 });
  const [items, setItems] = useState<Lead[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (filter === "qualified") params.qualified = "true";
      if (filter === "completed") params.status = "contacted";
      const [s, leads] = await Promise.all([adminApi.stats(), adminApi.leads(params)]);
      setStats(s);
      setItems(leads.items as unknown as Lead[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Leads"
        description="Diagnósticos capturados nesta instalação — qualificação, UTM e status."
        actions={
          <AdminButton onClick={() => void load()} disabled={loading}>
            {loading ? "Atualizando…" : "Atualizar"}
          </AdminButton>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStat label="Hoje" value={stats.today} />
        <AdminStat label="Total" value={stats.total} />
        <AdminStat label="Concluídos" value={stats.completed} />
        <AdminStat label="Qualificados" value={stats.qualified} />
      </div>

      <div className="flex flex-wrap gap-2">
        <AdminInput
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
          placeholder="Buscar nome, e-mail, agência…"
          className="min-w-[220px] flex-1"
        />
        <AdminSelect
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-auto min-w-[160px]"
        >
          <option value="">Todos</option>
          <option value="qualified">Qualificados</option>
          <option value="completed">Concluídos</option>
        </AdminSelect>
        <AdminButton onClick={() => void load()}>Filtrar</AdminButton>
      </div>

      <div className="overflow-hidden rounded-[var(--radius)] border border-border/70 bg-card shadow-[var(--shadow-surface-sm)]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border/60 bg-muted/40 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Lead</th>
                <th className="px-4 py-3.5 font-semibold">Agência</th>
                <th className="px-4 py-3.5 font-semibold">Qualif.</th>
                <th className="px-4 py-3.5 font-semibold">UTM</th>
                <th className="px-4 py-3.5 font-semibold">Quando</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Carregando leads…
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    Nenhum lead ainda. Abra /diagnostico para gerar o primeiro.
                  </td>
                </tr>
              )}
              {items.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t border-border/40 transition hover:bg-primary/[0.04]"
                >
                  <td className="px-4 py-3.5">
                    <Link
                      to={`/admin/leads/${lead.id}`}
                      className="font-semibold text-foreground hover:text-primary"
                    >
                      {lead.name}
                    </Link>
                    <div className="mt-0.5 text-xs text-muted-foreground">{lead.email}</div>
                    <div className="text-xs text-muted-foreground">{lead.phone}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-foreground">{lead.companyName}</div>
                    <div className="text-xs text-muted-foreground">{lead.revenueLevel || "—"}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {lead.isQualified ? (
                      <AdminBadge tone="success">Sim</AdminBadge>
                    ) : lead.completedAt ? (
                      <AdminBadge tone="warn">Oferta</AdminBadge>
                    ) : (
                      <AdminBadge>Andamento</AdminBadge>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {lead.utmSource || "—"}
                    {lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
