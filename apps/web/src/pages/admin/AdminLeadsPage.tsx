import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Leads</h1>
        <p className="mt-1 text-sm text-white/55">Diagnósticos capturados nesta instalação.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Hoje", stats.today],
          ["Total", stats.total],
          ["Concluídos", stats.completed],
          ["Qualificados", stats.qualified],
        ].map(([label, value]) => (
          <div key={label as string} className="border border-white/10 bg-[#0e1614] p-4">
            <div className="text-xs uppercase tracking-wide text-white/45">{label}</div>
            <div className="mt-2 font-display text-3xl font-bold text-[var(--leaf)]">{value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar nome, e-mail, agência…"
          className="min-w-[220px] flex-1 border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[var(--leaf)]"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-white/10 bg-black/20 px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="qualified">Qualificados</option>
          <option value="completed">Concluídos</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="bg-[var(--leaf)] px-4 py-2 text-sm font-bold text-[#0a140f]"
        >
          Filtrar
        </button>
      </div>

      <div className="overflow-x-auto border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/45">
            <tr>
              <th className="px-3 py-3">Lead</th>
              <th className="px-3 py-3">Agência</th>
              <th className="px-3 py-3">Qualif.</th>
              <th className="px-3 py-3">UTM</th>
              <th className="px-3 py-3">Quando</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-white/50">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-white/50">
                  Nenhum lead ainda.
                </td>
              </tr>
            )}
            {items.map((lead) => (
              <tr key={lead.id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-3">
                  <Link to={`/admin/leads/${lead.id}`} className="font-semibold text-white hover:text-[var(--leaf)]">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-white/45">{lead.email}</div>
                  <div className="text-xs text-white/45">{lead.phone}</div>
                </td>
                <td className="px-3 py-3">
                  <div>{lead.companyName}</div>
                  <div className="text-xs text-white/45">{lead.revenueLevel || "—"}</div>
                </td>
                <td className="px-3 py-3">
                  {lead.isQualified ? (
                    <span className="bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300">Sim</span>
                  ) : lead.completedAt ? (
                    <span className="bg-orange-500/15 px-2 py-1 text-xs text-orange-300">Oferta</span>
                  ) : (
                    <span className="text-xs text-white/40">Em andamento</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-white/55">
                  {lead.utmSource || "—"}
                  {lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}
                </td>
                <td className="px-3 py-3 text-xs text-white/55">
                  {new Date(lead.createdAt).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
