import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  GripVertical,
  Hash,
  Mail,
  MessageSquareText,
  Phone,
  Plus,
  Type,
} from "lucide-react";
import type { FlowBranchRule, FlowDefinition, FlowStepDef } from "../../lib/qualification/flow-runtime";
import { normalizeFlowDefinition } from "../../lib/qualification/flow-runtime";
import {
  AdminBadge,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "./ui";

const STEP_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "phone_br", label: "Telefone", icon: Phone },
  { value: "number_or_choice", label: "Número / chips", icon: Hash },
  { value: "multi_choice", label: "Múltipla escolha", icon: MessageSquareText },
  { value: "single_choice_cards", label: "Cards", icon: MessageSquareText },
  { value: "system_report", label: "Relatório", icon: MessageSquareText },
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

type SidebarTab = "score" | "visual" | "simulador" | "json";

function displayName(name?: string) {
  if (!name || name === "default") return "Diagnóstico agência";
  return name;
}

function optionsToText(options: FlowStepDef["options"]): string {
  if (!options?.length) return "";
  if (typeof options[0] === "string") return (options as string[]).join("\n");
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
      return {
        emoji: parts[0].length <= 2 ? parts[0] : undefined,
        label: parts[1],
        value: slug || parts[1],
      };
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

function typeMeta(type: string) {
  return STEP_TYPES.find((t) => t.value === type) || STEP_TYPES[0];
}

function newStepKey(steps: FlowStepDef[]): string {
  let i = steps.length + 1;
  let key = `step_${i}`;
  while (steps.some((s) => s.key === key)) {
    i += 1;
    key = `step_${i}`;
  }
  return key;
}

type Props = {
  value: FlowDefinition;
  onChange: (next: FlowDefinition) => void;
  json: string;
  onJsonChange: (raw: string) => void;
};

export function FlowBuilderWorkspace({ value, onChange, json, onJsonChange }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<SidebarTab>("score");
  const [formName, setFormName] = useState(displayName(value.name));
  const [formDesc, setFormDesc] = useState(
    "Monte o fluxo conversacional bloco a bloco."
  );

  useEffect(() => {
    setFormName(displayName(value.name));
  }, [value.name]);

  const steps = value.steps || [];
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

  function insertStep(at: number) {
    const key = newStepKey(steps);
    const step: FlowStepDef = {
      key,
      type: "text",
      field_key: key,
      required: true,
      bot_text: "Nova mensagem do bot…",
    };
    const copy = [...steps];
    copy.splice(at, 0, step);
    onChange({ ...value, steps: copy, name: formName || value.name });
    setExpanded(key);
  }

  function removeStep(key: string) {
    if (steps.length <= 1) return;
    onChange({ ...value, steps: steps.filter((s) => s.key !== key) });
    if (expanded === key) setExpanded(null);
  }

  function setBranch(next: FlowBranchRule) {
    patchRoot({ branching: [next] });
  }

  const previewBubbles = useMemo(
    () =>
      steps
        .filter((s) => s.type !== "system_report")
        .slice(0, 4)
        .map((s) => s.bot_text || STEP_LABELS[s.key] || s.key),
    [steps]
  );

  const sidebarTabs: Array<{ id: SidebarTab; label: string }> = [
    { id: "score", label: "Score" },
    { id: "visual", label: "Visual" },
    { id: "simulador", label: "Simulador" },
    { id: "json", label: "JSON" },
  ];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Nome">
              <AdminInput
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  patchRoot({ name: e.target.value.trim() || "Diagnóstico agência" });
                }}
                placeholder="Ex.: Diagnóstico agência"
              />
            </AdminField>
            <AdminField label="Descrição">
              <AdminInput
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Monte o fluxo conversacional bloco a bloco."
              />
            </AdminField>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-4 shadow-[var(--shadow-surface-sm)] sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-bold tracking-tight text-foreground">
              Fluxo conversacional
            </h2>
            <button
              type="button"
              onClick={() => insertStep(steps.length)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar bloco
            </button>
          </div>

          <div className="space-y-1.5">
            {steps.map((step, i) => {
              const open = expanded === step.key;
              const meta = typeMeta(String(step.type));
              const Icon = meta.icon;
              const mode = optionsMode(String(step.type));

              return (
                <div key={step.key}>
                  {i > 0 && (
                    <div className="flex justify-center py-0.5">
                      <button
                        type="button"
                        onClick={() => insertStep(i)}
                        className="text-[11px] font-medium text-muted-foreground/80 hover:text-primary"
                      >
                        + Adicionar bloco
                      </button>
                    </div>
                  )}

                  <div
                    className={`overflow-hidden rounded-xl border bg-white transition ${
                      open
                        ? "border-primary/35 shadow-[var(--shadow-surface-sm)]"
                        : "border-border/55 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-0.5 pl-2 text-muted-foreground/50">
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted hover:text-foreground disabled:opacity-25"
                          disabled={i === 0}
                          onClick={() => moveStep(step.key, -1)}
                          aria-label="Subir"
                        >
                          <span className="text-[10px]">▲</span>
                        </button>
                        <GripVertical className="h-4 w-4" />
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted hover:text-foreground disabled:opacity-25"
                          disabled={i === steps.length - 1}
                          onClick={() => moveStep(step.key, 1)}
                          aria-label="Descer"
                        >
                          <span className="text-[10px]">▼</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left"
                        onClick={() => setExpanded(open ? null : step.key)}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                          <Icon className="h-3.5 w-3.5" strokeWidth={2.25} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-foreground">
                          {step.bot_text || STEP_LABELS[step.key] || step.key}
                        </span>
                        <input
                          className="hidden w-32 shrink-0 rounded-lg border border-border/60 bg-[#f8f9fb] px-2 py-1.5 font-mono text-[11px] text-muted-foreground outline-none focus:border-primary sm:block"
                          value={step.key}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const nextKey = e.target.value
                              .trim()
                              .replace(/\s+/g, "_")
                              .toLowerCase();
                            if (
                              !nextKey ||
                              steps.some((s) => s.key === nextKey && s.key !== step.key)
                            ) {
                              return;
                            }
                            onChange({
                              ...value,
                              steps: steps.map((s) =>
                                s.key === step.key ? { ...s, key: nextKey } : s
                              ),
                            });
                            if (expanded === step.key) setExpanded(nextKey);
                          }}
                          aria-label="Label interno"
                        />
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${
                            open ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    </div>

                    {open && (
                      <div className="space-y-3 border-t border-border/50 bg-[#fbfcfd] px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <AdminField label="Tipo">
                            <AdminSelect
                              value={String(step.type)}
                              onChange={(e) => updateStep(step.key, { type: e.target.value })}
                            >
                              {STEP_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                  {t.label}
                                </option>
                              ))}
                            </AdminSelect>
                          </AdminField>
                          <AdminField label="Campo do lead">
                            <AdminInput
                              value={step.field_key || ""}
                              onChange={(e) =>
                                updateStep(step.key, {
                                  field_key: e.target.value.trim() || null,
                                })
                              }
                            />
                          </AdminField>
                        </div>

                        <AdminField
                          label="Mensagem do bot"
                          hint="{brand} {primeiroNome} {nome} {empresa}"
                        >
                          <AdminTextarea
                            className="min-h-24"
                            value={step.bot_text || ""}
                            onChange={(e) =>
                              updateStep(step.key, { bot_text: e.target.value })
                            }
                          />
                        </AdminField>

                        <AdminField label="Erro (opcional)">
                          <AdminInput
                            value={step.error || ""}
                            onChange={(e) =>
                              updateStep(step.key, {
                                error: e.target.value || undefined,
                              })
                            }
                          />
                        </AdminField>

                        {mode && (
                          <AdminField
                            label={
                              mode === "chips"
                                ? "Opções (uma por linha)"
                                : "Cards (emoji | label | value)"
                            }
                          >
                            <AdminTextarea
                              className="min-h-28 font-mono text-xs"
                              value={optionsToText(step.options)}
                              onChange={(e) =>
                                updateStep(step.key, {
                                  options: textToOptions(e.target.value, mode),
                                })
                              }
                            />
                          </AdminField>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <label className="flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={step.required !== false}
                              onChange={(e) =>
                                updateStep(step.key, { required: e.target.checked })
                              }
                              className="accent-primary"
                            />
                            Obrigatório
                          </label>
                          <button
                            type="button"
                            className="text-xs font-semibold text-destructive hover:underline"
                            onClick={() => removeStep(step.key)}
                          >
                            Remover bloco
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="xl:sticky xl:top-[calc(4.5rem+1rem)] xl:self-start">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-white shadow-[var(--shadow-surface-sm)]">
          <div className="flex border-b border-border/50">
            {sidebarTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSidebar(tab.id)}
                className={`flex-1 px-1.5 py-3 text-[11px] font-semibold uppercase tracking-wide transition ${
                  sidebar === tab.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-4">
            {sidebar === "score" && (
              <div className="space-y-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Valores listados seguem para <strong className="text-foreground">oferta</strong>;
                  os demais vão para WhatsApp.
                </p>
                <AdminField label="Campo">
                  <AdminInput
                    value={branch?.when?.field || "revenue_level"}
                    onChange={(e) =>
                      setBranch({
                        ...branch,
                        when: {
                          ...branch?.when,
                          field: e.target.value,
                          in: branch?.when?.in || [],
                        },
                        then: branch?.then || { offer: "plano_essencial" },
                        else: branch?.else || { cta: "whatsapp" },
                      })
                    }
                  />
                </AdminField>
                <AdminField label="Valores → oferta">
                  <AdminTextarea
                    className="min-h-28 font-mono text-xs"
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
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FFF7E8] px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase text-[#B45309]">Oferta</div>
                    <div className="mt-0.5 text-xs text-foreground">then</div>
                  </div>
                  <div className="rounded-xl bg-primary/10 px-3 py-3 text-center">
                    <div className="text-[10px] font-bold uppercase text-primary">WhatsApp</div>
                    <div className="mt-0.5 text-xs text-foreground">else</div>
                  </div>
                </div>
              </div>
            )}

            {sidebar === "visual" && (
              <div className="space-y-4">
                <AdminField label="Label do assistente" hint="Use {brand}">
                  <AdminInput
                    value={value.brandVars?.assistantLabel || ""}
                    onChange={(e) =>
                      patchRoot({
                        brandVars: {
                          ...value.brandVars,
                          assistantLabel: e.target.value,
                        },
                      })
                    }
                    placeholder="{brand} · IA"
                  />
                </AdminField>
                <p className="rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  O chat público usa teal WhatsApp. Cores do formulário ficam em{" "}
                  <strong className="text-foreground">Marca</strong>.
                </p>
                <AdminBadge tone="live">#128C7E</AdminBadge>
              </div>
            )}

            {sidebar === "simulador" && (
              <div className="overflow-hidden rounded-2xl border border-black/5 bg-[#E5DDD5]">
                <div className="bg-[linear-gradient(180deg,#128C7E,#0D655B)] px-3 py-2.5 text-white">
                  <div className="text-[13px] font-semibold">Muratori · IA</div>
                  <div className="text-[10px] text-white/70">prévia</div>
                </div>
                <div className="space-y-2 p-3">
                  {previewBubbles.map((text, i) => (
                    <div
                      key={i}
                      className="max-w-[92%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[12px] leading-snug text-[#111B21] shadow-sm"
                    >
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebar === "json" && (
              <AdminTextarea
                className="min-h-[380px] font-mono text-[11px] leading-relaxed"
                value={json}
                onChange={(e) => onJsonChange(e.target.value)}
                spellCheck={false}
              />
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function parseFlowJson(
  raw: string
): { ok: true; value: FlowDefinition } | { ok: false; error: string } {
  try {
    return { ok: true, value: normalizeFlowDefinition(JSON.parse(raw) as unknown) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "JSON inválido" };
  }
}

export function flowToJson(def: FlowDefinition): string {
  return JSON.stringify(def, null, 2);
}
