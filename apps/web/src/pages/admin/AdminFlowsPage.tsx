import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  FlowBuilderWorkspace,
  flowToJson,
  parseFlowJson,
} from "../../components/admin/FlowBuilderWorkspace";
import type { FlowDefinition } from "../../lib/qualification/flow-runtime";
import { normalizeFlowDefinition } from "../../lib/qualification/flow-runtime";
import { AdminBadge, AdminButton } from "../../components/admin/ui";
import { PageHeaderPremium } from "../../components/admin/PageHeaderPremium";

export function AdminFlowsPage() {
  const [flows, setFlows] = useState<Array<Record<string, unknown>>>([]);
  const [definition, setDefinition] = useState<FlowDefinition | null>(null);
  const [json, setJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const live = flows.find((f) => f.publishedAt);

  function applyDefinition(def: FlowDefinition, markDirty = false) {
    const normalized = normalizeFlowDefinition(def);
    setDefinition(normalized);
    setJson(flowToJson(normalized));
    setDirty(markDirty);
  }

  async function load() {
    const items = await adminApi.flows();
    setFlows(items);
    const published = items.find((f) => f.publishedAt) || items[0];
    if (published?.definition) {
      applyDefinition(normalizeFlowDefinition(published.definition), false);
    }
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
  }, []);

  async function save(publish: boolean) {
    const fromJson = parseFlowJson(json);
    const def = fromJson.ok ? fromJson.value : definition;
    if (!def) {
      toast.error(fromJson.ok === false ? fromJson.error : "Nenhum fluxo");
      return;
    }
    setSaving(true);
    try {
      await adminApi.saveFlow({ definition: def, publish });
      toast.success(publish ? "Fluxo publicado" : "Rascunho salvo");
      setDirty(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!definition) {
    return (
      <div className="rounded-[var(--radius)] border border-border/70 bg-card p-8 text-sm text-muted-foreground shadow-[var(--shadow-surface-sm)]">
        Carregando builder…
      </div>
    );
  }

  const stepCount = definition.steps?.length || 0;
  const title = definition.name && definition.name !== "default"
    ? definition.name
    : "Diagnóstico agência";

  return (
    <div className="space-y-5">
      <PageHeaderPremium
        eyebrow="Legado"
        showModuleNav={false}
        title={title}
        description="Monte o fluxo conversacional bloco a bloco."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminBadge tone={dirty || !live ? "warn" : "live"}>
              {dirty || !live ? "Rascunho" : "Publicado"}
            </AdminBadge>
            <span className="text-xs font-medium text-muted-foreground">
              {stepCount} etapas
            </span>
            <Link
              to="/admin"
              className="rounded-full border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/35"
            >
              Voltar
            </Link>
            <AdminButton
              variant="ghost"
              disabled={saving}
              onClick={() => void save(false)}
            >
              Salvar
            </AdminButton>
            <AdminButton disabled={saving} onClick={() => void save(true)}>
              Publicar
            </AdminButton>
          </div>
        }
      />

      <FlowBuilderWorkspace
        value={definition}
        json={json}
        onJsonChange={(raw) => {
          setJson(raw);
          setDirty(true);
          const parsed = parseFlowJson(raw);
          if (parsed.ok) setDefinition(parsed.value);
        }}
        onChange={(next) => {
          applyDefinition(next, true);
        }}
      />

      {flows.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Versões:</span>
          {flows.map((f) => (
            <button
              key={String(f.id)}
              type="button"
              className="rounded-full border border-border/60 bg-card px-2.5 py-1 hover:border-primary/40 hover:text-primary"
              onClick={() => applyDefinition(normalizeFlowDefinition(f.definition), false)}
            >
              v{String(f.version)}
              {f.publishedAt ? " · live" : " · draft"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
