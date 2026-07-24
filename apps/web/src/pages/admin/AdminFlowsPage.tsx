import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  FlowVisualEditor,
  flowToJson,
  parseFlowJson,
} from "../../components/admin/FlowVisualEditor";
import type { FlowDefinition } from "../../lib/qualification/flow-runtime";
import { normalizeFlowDefinition } from "../../lib/qualification/flow-runtime";
import {
  AdminBadge,
  AdminButton,
  AdminPageHeader,
  AdminPanel,
  AdminTextarea,
} from "../../components/admin/ui";

type Mode = "visual" | "json";

export function AdminFlowsPage() {
  const [flows, setFlows] = useState<Array<Record<string, unknown>>>([]);
  const [definition, setDefinition] = useState<FlowDefinition | null>(null);
  const [json, setJson] = useState("");
  const [mode, setMode] = useState<Mode>("visual");
  const [selectedKey, setSelectedKey] = useState<string | null>("name");
  const [saving, setSaving] = useState(false);

  function applyDefinition(def: FlowDefinition) {
    const normalized = normalizeFlowDefinition(def);
    setDefinition(normalized);
    setJson(flowToJson(normalized));
    if (!normalized.steps.find((s) => s.key === selectedKey)) {
      setSelectedKey(normalized.steps[0]?.key ?? null);
    }
  }

  async function load() {
    const items = await adminApi.flows();
    setFlows(items);
    const published = items.find((f) => f.publishedAt) || items[0];
    if (published?.definition) {
      applyDefinition(normalizeFlowDefinition(published.definition));
    }
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncFromJson(): FlowDefinition | null {
    const parsed = parseFlowJson(json);
    if (parsed.ok === false) {
      toast.error(parsed.error);
      return null;
    }
    applyDefinition(parsed.value);
    return parsed.value;
  }

  function currentDefinition(): FlowDefinition | null {
    if (mode === "json") return syncFromJson();
    if (!definition) {
      toast.error("Nenhum fluxo carregado");
      return null;
    }
    return definition;
  }

  async function save(publish: boolean) {
    const def = currentDefinition();
    if (!def) return;
    setSaving(true);
    try {
      await adminApi.saveFlow({ definition: def, publish });
      toast.success(publish ? "Fluxo publicado" : "Rascunho salvo");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function switchMode(next: Mode) {
    if (next === mode) return;
    if (next === "json" && definition) {
      setJson(flowToJson(definition));
    }
    if (next === "visual") {
      const parsed = parseFlowJson(json);
      if (parsed.ok === false) {
        toast.error(`Corrija o JSON antes de voltar ao visual: ${parsed.error}`);
        return;
      }
      applyDefinition(parsed.value);
    }
    setMode(next);
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Fluxo do diagnóstico"
        description="Edite os passos do chat visualmente. O público lê a versão publicada em tempo real."
        actions={
          <div className="flex overflow-hidden border border-white/10">
            <button
              type="button"
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                mode === "visual"
                  ? "bg-[var(--leaf)] text-[#0a140f]"
                  : "bg-transparent text-white/50 hover:text-white"
              }`}
              onClick={() => switchMode("visual")}
            >
              Visual
            </button>
            <button
              type="button"
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition ${
                mode === "json"
                  ? "bg-[var(--leaf)] text-[#0a140f]"
                  : "bg-transparent text-white/50 hover:text-white"
              }`}
              onClick={() => switchMode("json")}
            >
              JSON
            </button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          {mode === "visual" && definition ? (
            <FlowVisualEditor
              value={definition}
              onChange={(next) => {
                setDefinition(next);
                setJson(flowToJson(next));
              }}
              selectedKey={selectedKey}
              onSelectKey={setSelectedKey}
            />
          ) : mode === "visual" && !definition ? (
            <AdminPanel>
              <p className="text-sm text-white/45">Carregando fluxo…</p>
            </AdminPanel>
          ) : (
            <AdminPanel className="!p-0 overflow-hidden">
              <AdminTextarea
                className="min-h-[560px] resize-y rounded-none border-0 bg-black/40 p-5 font-mono text-xs leading-relaxed focus:border-0"
                value={json}
                onChange={(e) => setJson(e.target.value)}
                spellCheck={false}
              />
            </AdminPanel>
          )}
        </div>

        <div className="space-y-3">
          <AdminButton
            disabled={saving || !definition}
            className="w-full !py-3"
            onClick={() => void save(true)}
          >
            Publicar nova versão
          </AdminButton>
          <AdminButton
            variant="ghost"
            disabled={saving || !definition}
            className="w-full !py-3"
            onClick={() => void save(false)}
          >
            Salvar rascunho
          </AdminButton>

          {mode === "json" && (
            <AdminButton
              variant="ghost"
              className="w-full !py-2 text-xs"
              onClick={() => {
                const parsed = syncFromJson();
                if (parsed) toast.success("JSON validado");
              }}
            >
              Validar JSON
            </AdminButton>
          )}

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
                    onClick={() => {
                      applyDefinition(normalizeFlowDefinition(f.definition));
                      setMode("visual");
                    }}
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

          <p className="text-[11px] leading-relaxed text-white/35">
            Dica: altere o texto de um passo, publique e abra /diagnostico — a mudança vale na hora.
          </p>
        </div>
      </div>
    </div>
  );
}
