import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminBadge,
  AdminButton,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "../../components/admin/ui";

export function AdminFlowsPage() {
  const [flows, setFlows] = useState<Array<Record<string, unknown>>>([]);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const items = await adminApi.flows();
    setFlows(items);
    const published = items.find((f) => f.publishedAt) || items[0];
    if (published?.definition) {
      setJson(JSON.stringify(published.definition, null, 2));
    }
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Fluxo do diagnóstico"
        description="O chat público lê o fluxo publicado em tempo real (textos, opções, ordem e branching)."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <AdminPanel className="!p-0 overflow-hidden">
          <AdminTextarea
            className="min-h-[520px] resize-y rounded-none border-0 bg-black/40 p-5 font-mono text-xs leading-relaxed focus:border-0"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            spellCheck={false}
          />
        </AdminPanel>

        <div className="space-y-3">
          <AdminButton
            disabled={saving}
            className="w-full !py-3"
            onClick={async () => {
              setSaving(true);
              try {
                const definition = JSON.parse(json);
                await adminApi.saveFlow({ definition, publish: true });
                toast.success("Fluxo publicado");
                void load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "JSON inválido");
              } finally {
                setSaving(false);
              }
            }}
          >
            Publicar nova versão
          </AdminButton>
          <AdminButton
            variant="ghost"
            disabled={saving}
            className="w-full !py-3"
            onClick={async () => {
              setSaving(true);
              try {
                const definition = JSON.parse(json);
                await adminApi.saveFlow({ definition, publish: false });
                toast.success("Rascunho salvo");
                void load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "JSON inválido");
              } finally {
                setSaving(false);
              }
            }}
          >
            Salvar rascunho
          </AdminButton>

          <AdminPanel title="Versões" className="!p-4">
            <ul className="space-y-2">
              {flows.map((f) => (
                <li
                  key={String(f.id)}
                  className="flex items-center justify-between gap-2 border-b border-white/[0.05] pb-2 last:border-0 last:pb-0"
                >
                  <button
                    type="button"
                    className="text-left text-sm hover:text-[var(--leaf)]"
                    onClick={() => setJson(JSON.stringify(f.definition, null, 2))}
                  >
                    <span className="font-semibold">v{String(f.version)}</span>
                    <span className="ml-2">
                      {f.publishedAt ? (
                        <AdminBadge tone="live">Live</AdminBadge>
                      ) : (
                        <AdminBadge>Draft</AdminBadge>
                      )}
                    </span>
                  </button>
                  {!f.publishedAt && (
                    <button
                      type="button"
                      className="text-xs font-bold text-[var(--leaf)]"
                      onClick={async () => {
                        await adminApi.publishFlow(String(f.id));
                        toast.success("Publicado");
                        void load();
                      }}
                    >
                      Publish
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
