import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

export function AdminFlowsPage() {
  const [flows, setFlows] = useState<Array<Record<string, unknown>>>([]);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const items = await adminApi.flows();
    setFlows(items);
    const published =
      items.find((f) => f.publishedAt) || items[0];
    if (published?.definition) {
      setJson(JSON.stringify(published.definition, null, 2));
    }
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Fluxo do diagnóstico</h1>
        <p className="mt-1 text-sm text-white/55">
          Editor JSON versionado (base do flow builder). Publicar não quebra rascunhos antigos.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <textarea
          className="min-h-[480px] w-full border border-white/10 bg-black/30 p-4 font-mono text-xs text-white outline-none focus:border-[var(--leaf)]"
          value={json}
          onChange={(e) => setJson(e.target.value)}
          spellCheck={false}
        />
        <div className="space-y-3">
          <button
            type="button"
            disabled={saving}
            className="w-full bg-[var(--leaf)] py-3 text-sm font-bold text-[#0a140f] disabled:opacity-50"
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
          </button>
          <button
            type="button"
            disabled={saving}
            className="w-full border border-white/15 py-3 text-sm hover:border-white/40"
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
          </button>

          <div className="border border-white/10 bg-[#0e1614] p-3 text-xs text-white/55">
            <div className="font-semibold text-white/80">Versões</div>
            <ul className="mt-2 space-y-2">
              {flows.map((f) => (
                <li key={String(f.id)} className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="text-left hover:text-[var(--leaf)]"
                    onClick={() => setJson(JSON.stringify(f.definition, null, 2))}
                  >
                    v{String(f.version)} {f.publishedAt ? "· live" : "· draft"}
                  </button>
                  {!f.publishedAt && (
                    <button
                      type="button"
                      className="text-[var(--leaf)]"
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
          </div>
        </div>
      </div>
    </div>
  );
}
