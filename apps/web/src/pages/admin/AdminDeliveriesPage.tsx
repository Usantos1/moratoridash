import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

export function AdminDeliveriesPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [status, setStatus] = useState("");

  async function load() {
    try {
      setItems(await adminApi.deliveries(status || undefined));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  }

  useEffect(() => {
    void load();
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold">Entregas</h1>
          <p className="mt-1 text-sm text-white/55">
            Pipeline idempotente (webhook, Meta, Google).
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border border-white/10 bg-black/20 px-3 py-2 text-sm"
        >
          <option value="">Todas</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="ignored">Ignored</option>
        </select>
      </div>

      <div className="space-y-2">
        {items.map((item) => {
          const lead = item.lead as Record<string, unknown> | undefined;
          return (
            <div
              key={String(item.id)}
              className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-[#0e1614] px-4 py-3"
            >
              <div>
                <div className="text-sm font-semibold">
                  {String(item.destination)} · {String(item.eventName)}
                </div>
                <div className="text-xs text-white/45">
                  {lead ? `${lead.name} · ${lead.email}` : String(item.leadId)}
                </div>
                {item.lastError ? (
                  <div className="mt-1 text-xs text-rose-300">{String(item.lastError)}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {String(item.status)} · {String(item.attempts)}x
                </span>
                {(item.status === "failed" || item.status === "ignored") && (
                  <button
                    type="button"
                    className="border border-white/15 px-3 py-1.5 text-xs hover:border-[var(--leaf)]"
                    onClick={async () => {
                      try {
                        await adminApi.retryDelivery(String(item.id));
                        toast.success("Reprocessado");
                        void load();
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Erro");
                      }
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
