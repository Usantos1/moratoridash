import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminBadge,
  AdminButton,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
} from "../../components/admin/ui";

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

  function toneFor(statusValue: string) {
    if (statusValue === "sent") return "success" as const;
    if (statusValue === "failed") return "danger" as const;
    if (statusValue === "pending") return "warn" as const;
    return "neutral" as const;
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Entregas"
        description="Pipeline idempotente (webhook, Meta, Google)."
        actions={
          <AdminSelect
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-auto min-w-[140px]"
          >
            <option value="">Todas</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="ignored">Ignored</option>
          </AdminSelect>
        }
      />

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma entrega neste filtro.</p>
        )}
        {items.map((item) => {
          const lead = item.lead as Record<string, unknown> | undefined;
          return (
            <AdminPanel key={String(item.id)} className="!py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {String(item.destination)} · {String(item.eventName)}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {lead ? `${lead.name} · ${lead.email}` : String(item.leadId)}
                  </div>
                  {item.lastError ? (
                    <div className="mt-2 text-xs text-rose-300">{String(item.lastError)}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <AdminBadge tone={toneFor(String(item.status))}>
                    {String(item.status)} · {String(item.attempts)}x
                  </AdminBadge>
                  {(item.status === "failed" || item.status === "ignored") && (
                    <AdminButton
                      variant="ghost"
                      className="!py-1.5 text-xs"
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
                    </AdminButton>
                  )}
                </div>
              </div>
            </AdminPanel>
          );
        })}
      </div>
    </div>
  );
}
