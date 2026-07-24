import { useMemo } from "react";
import type { FlowBranchRule, FlowDefinition, FlowStepDef } from "../../lib/qualification/flow-runtime";
import { normalizeFlowDefinition } from "../../lib/qualification/flow-runtime";
import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminInput,
  AdminPanel,
  AdminSelect,
  AdminTextarea,
} from "./ui";

const STEP_TYPES = [
  { value: "text", label: "Texto" },
  { value: "email", label: "E-mail" },
  { value: "phone_br", label: "Telefone BR" },
  { value: "number_or_choice", label: "Número / chips" },
  { value: "multi_choice", label: "Múltipla escolha" },
  { value: "single_choice_cards", label: "Cards (1 opção)" },
  { value: "system_report", label: "Relatório" },
] as const;

const STEP_LABELS: Record<string, string> = {
  name: "Nome",
  email: "E-mail",
  phone: "WhatsApp",
  company: "Agência",
  attendants: "Atendentes",
  niches: "Nichos",
  clients: "Leads/dia",
  revenue: "Faturamento",
  response: "Tempo de resposta",
  result: "Diagnóstico",
};

function optionsToText(options: FlowStepDef["options"]): string {
  if (!options?.length) return "";
  if (typeof options[0] === "string") {
    return (options as string[]).join("\n");
  }
  return (options as Array<{ value: string; label: string; emoji?: string }>)
    .map((o) => [o.emoji, o.label, o.value].filter(Boolean).join(" | "))
    .join("\n");
}

function textToOptions(
  text: string,
  mode: "chips" | "cards"
): FlowStepDef["options"] {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return undefined;
  if (mode === "chips") return lines;
  return lines.map((line) => {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      return { emoji: parts[0], label: parts[1], value: parts[2] };
    }
    if (parts.length === 2) {
      const slug = parts[1]
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      return { emoji: parts[0].length <= 2 ? parts[0] : undefined, label: parts[1], value: slug || parts[1] };
    }
    const slug = line
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    return { label: line, value: slug || line };
  });
}

function optionsMode(type: string): "chips" | "cards" | null {
  if (type === "number_or_choice" || type === "multi_choice") return "chips";
  if (type === "single_choice_cards") return "cards";
  return null;
}

type Props = {
  value: FlowDefinition;
  onChange: (next: FlowDefinition) => void;
  selectedKey: string | null;
  onSelectKey: (key: string | null) => void;
};

export function FlowVisualEditor({ value, onChange, selectedKey, onSelectKey }: Props) {
  const steps = value.steps || [];
  const selected = useMemo(
    () => steps.find((s) => s.key === selectedKey) || null,
    [steps, selectedKey]
  );
  const branch = value.branching?.[0];

  function patchRoot(patch: Partial<FlowDefinition>) {
    onChange({ ...value, ...patch });
  }

  function updateStep(key: string, patch: Partial<FlowStepDef>) {
    onChange({
      ...value,
      steps: steps.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    });
  }

  function moveStep(key: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.key === key);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= steps.length) return;
    const copy = [...steps];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    onChange({ ...value, steps: copy });
  }

  function setBranch(next: FlowBranchRule) {
    patchRoot({ branching: [next] });
  }

  const mode = selected ? optionsMode(String(selected.type)) : null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        <AdminPanel title="Passos" subtitle="Clique para editar · setas para reordenar" className="!p-4">
          <ul className="space-y-1">
            {steps.map((step, i) => {
              const active = step.key === selectedKey;
              return (
                <li key={step.key}>
                  <div
                    className={`flex items-stretch gap-1 border ${
                      active
                        ? "border-[var(--leaf)]/50 bg-[var(--leaf)]/10"
                        : "border-transparent hover:border-white/10 hover:bg-white/[0.03]"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                      onClick={() => onSelectKey(step.key)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-white/30">{i + 1}</span>
                        <span className="truncate text-sm font-semibold text-white">
                          {STEP_LABELS[step.key] || step.key}
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-white/35">
                        {STEP_TYPES.find((t) => t.value === step.type)?.label || step.type}
                      </div>
                    </button>
                    <div className="flex flex-col border-l border-white/[0.06]">
                      <button
                        type="button"
                        className="px-2 py-1 text-xs text-white/40 hover:text-white disabled:opacity-20"
                        disabled={i === 0}
                        onClick={() => moveStep(step.key, -1)}
                        aria-label="Subir"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-xs text-white/40 hover:text-white disabled:opacity-20"
                        disabled={i === steps.length - 1}
                        onClick={() => moveStep(step.key, 1)}
                        aria-label="Descer"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </AdminPanel>

        <AdminPanel title="Assistente" className="!p-4">
          <AdminField label="Label no chat" hint="Use {brand} para o nome da marca">
            <AdminInput
              value={value.brandVars?.assistantLabel || ""}
              onChange={(e) =>
                patchRoot({
                  brandVars: { ...value.brandVars, assistantLabel: e.target.value },
                })
              }
              placeholder="{brand} · IA"
            />
          </AdminField>
        </AdminPanel>

        <AdminPanel title="Branching" subtitle="Quando mostrar oferta vs WhatsApp" className="!p-4">
          <AdminField label="Campo">
            <AdminInput
              value={branch?.when?.field || "revenue_level"}
              onChange={(e) =>
                setBranch({
                  ...branch,
                  when: { ...branch?.when, field: e.target.value, in: branch?.when?.in || [] },
                  then: branch?.then || { offer: "plano_essencial" },
                  else: branch?.else || { cta: "whatsapp" },
                })
              }
            />
          </AdminField>
          <div className="mt-3">
            <AdminField
              label="Valores → oferta"
              hint="Um por linha (ex.: de_10_25)"
            >
              <AdminTextarea
                className="min-h-24 font-mono text-xs"
                value={(branch?.when?.in || []).join("\n")}
                onChange={(e) =>
                  setBranch({
                    when: {
                      field: branch?.when?.field || "revenue_level",
                      in: e.target.value
                        .split("\n")
                        .map((l) => l.trim())
                        .filter(Boolean),
                    },
                    then: branch?.then || { offer: "plano_essencial" },
                    else: branch?.else || { cta: "whatsapp" },
                  })
                }
              />
            </AdminField>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <AdminBadge tone="warn">then: oferta</AdminBadge>
            <AdminBadge tone="live">else: WhatsApp</AdminBadge>
          </div>
        </AdminPanel>
      </div>

      <div>
        {!selected ? (
          <AdminPanel className="flex min-h-[420px] items-center justify-center">
            <p className="text-sm text-white/45">Selecione um passo à esquerda para editar.</p>
          </AdminPanel>
        ) : (
          <AdminPanel
            title={STEP_LABELS[selected.key] || selected.key}
            subtitle={`key: ${selected.key}`}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <AdminField label="Tipo">
                <AdminSelect
                  value={String(selected.type)}
                  onChange={(e) => updateStep(selected.key, { type: e.target.value })}
                >
                  {STEP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </AdminSelect>
              </AdminField>
              <AdminField label="Campo do lead (field_key)">
                <AdminInput
                  value={selected.field_key || ""}
                  onChange={(e) =>
                    updateStep(selected.key, {
                      field_key: e.target.value.trim() || null,
                    })
                  }
                  placeholder="name, email…"
                />
              </AdminField>
            </div>

            <div className="mt-4">
              <AdminField
                label="Mensagem do bot"
                hint="Variáveis: {brand} {primeiroNome} {nome} {empresa}"
              >
                <AdminTextarea
                  className="min-h-32"
                  value={selected.bot_text || ""}
                  onChange={(e) => updateStep(selected.key, { bot_text: e.target.value })}
                />
              </AdminField>
            </div>

            <div className="mt-4">
              <AdminField label="Mensagem de erro (opcional)">
                <AdminInput
                  value={selected.error || ""}
                  onChange={(e) => updateStep(selected.key, { error: e.target.value || undefined })}
                />
              </AdminField>
            </div>

            <label className="mt-4 flex items-center gap-2 text-sm text-white/70">
              <input
                type="checkbox"
                checked={selected.required !== false}
                onChange={(e) => updateStep(selected.key, { required: e.target.checked })}
                className="accent-[var(--leaf)]"
              />
              Obrigatório
            </label>

            {mode && (
              <div className="mt-5">
                <AdminField
                  label={mode === "chips" ? "Opções (uma por linha)" : "Cards (emoji | label | value)"}
                  hint={
                    mode === "cards"
                      ? "Ex.: 🌱 | R$ 10.000 - R$ 25.000/mês | de_10_25"
                      : "Ex.: 1  ·  50+  ·  Clínicas e Saúde"
                  }
                >
                  <AdminTextarea
                    className="min-h-40 font-mono text-xs"
                    value={optionsToText(selected.options)}
                    onChange={(e) =>
                      updateStep(selected.key, {
                        options: textToOptions(e.target.value, mode),
                      })
                    }
                  />
                </AdminField>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <AdminButton variant="ghost" onClick={() => onSelectKey(null)}>
                Fechar painel
              </AdminButton>
            </div>
          </AdminPanel>
        )}
      </div>
    </div>
  );
}

/** Converte texto JSON ↔ definição tipada com fallback seguro. */
export function parseFlowJson(raw: string): { ok: true; value: FlowDefinition } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return { ok: true, value: normalizeFlowDefinition(parsed) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON inválido" };
  }
}

export function flowToJson(def: FlowDefinition): string {
  return JSON.stringify(def, null, 2);
}
