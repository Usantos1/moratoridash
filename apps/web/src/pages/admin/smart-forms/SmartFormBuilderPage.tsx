import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import {
  coerceDefinition,
  coerceSettings,
  type FormSettings,
  type SmartFormDefinition,
  type SmartFormRecord,
} from "../../../lib/smart-forms/types";
import { SmartFormBuilder } from "../../../components/smart-forms/SmartFormBuilder";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminBadge, AdminButton } from "../../../components/admin/ui";

export function SmartFormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<SmartFormRecord | null>(null);
  const [definition, setDefinition] = useState<SmartFormDefinition | null>(null);
  const [settings, setSettings] = useState<FormSettings>({});
  const [domains, setDomains] = useState<Array<Record<string, unknown>>>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!id) return;
    const [f, dom] = await Promise.all([
      smartFormsApi.get(id),
      smartFormsApi.domains(),
    ]);
    setForm(f);
    setDefinition(coerceDefinition(f.draftDefinition));
    setSettings(coerceSettings(f.settings));
    setDomains(
      (dom.items || []).filter((d) => !d.formId || d.formId === id)
    );
    setDirty(false);
  }

  useEffect(() => {
    void load().catch((e) => toast.error(e.message));
  }, [id]);

  async function save(publish: boolean) {
    if (!form || !definition) return;
    setSaving(true);
    try {
      const updated = await smartFormsApi.update(form.id, {
        name: form.name,
        description: form.description ?? null,
        draftDefinition: definition,
        settings,
        scoreColdMax: form.scoreColdMax,
        scoreWarmMax: form.scoreWarmMax,
        scoreHotMax: form.scoreHotMax,
        aiSystemPrompt: form.aiSystemPrompt ?? null,
        aiEnabled: form.aiEnabled,
        crmSyncEnabled: form.crmSyncEnabled,
      });
      let finalForm = updated;
      if (publish) {
        finalForm = await smartFormsApi.publish(form.id);
        toast.success("Formulário publicado");
      } else {
        toast.success("Rascunho salvo");
      }
      setForm(finalForm);
      setDefinition(coerceDefinition(finalForm.draftDefinition));
      setSettings(coerceSettings(finalForm.settings));
      setDirty(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!form || !definition) {
    return (
      <div className="rounded-2xl border border-border/60 bg-white p-8 text-sm text-muted-foreground">
        Carregando builder…
      </div>
    );
  }

  const stepCount = definition.nodes.length;
  const isDraft = dirty || form.status !== "PUBLISHED";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            {form.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte o fluxo conversacional bloco a bloco.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AdminBadge tone={isDraft ? "warn" : "live"}>
              {isDraft ? "Rascunho" : "Publicado"}
            </AdminBadge>
            <span className="text-xs font-medium text-muted-foreground">
              {stepCount} etapas
            </span>
            <span className="text-xs text-muted-foreground">
              /f/{form.publicSlug}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <FormsModuleNav />
          <Link
            to="/admin/forms"
            className="rounded-full border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/35"
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
      </div>

      <SmartFormBuilder
        form={form}
        definition={definition}
        settings={settings}
        domains={domains}
        onDefinition={(next) => {
          setDefinition(next);
          setDirty(true);
        }}
        onSettings={(next) => {
          setSettings(next);
          setDirty(true);
        }}
        onMeta={(patch) => {
          setForm({ ...form, ...patch });
          setDirty(true);
        }}
        onAddDomain={(hostname) => {
          void smartFormsApi
            .addDomain(hostname, form.id)
            .then(() => load())
            .then(() => toast.success("Domínio adicionado"))
            .catch((e) => toast.error(e.message));
        }}
        onDeleteDomain={(domainId) => {
          void smartFormsApi
            .deleteDomain(domainId)
            .then(() => load())
            .then(() => toast.success("Removido"))
            .catch((e) => toast.error(e.message));
        }}
        onVerifyDomain={(domainId) => {
          void smartFormsApi
            .verifyDomain(domainId)
            .then((res) => {
              toast[res.ok ? "success" : "error"](res.message);
              return load();
            })
            .catch((e) => toast.error(e.message));
        }}
      />
    </div>
  );
}
