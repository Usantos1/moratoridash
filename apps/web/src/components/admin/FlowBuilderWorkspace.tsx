import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Code2,
  Gauge,
  GripVertical,
  Hash,
  LayoutGrid,
  ListChecks,
  Mail,
  MessageSquareText,
  Palette,
  Phone,
  Plus,
  Smartphone,
  Type,
} from "lucide-react";
import type {
  FlowBranchRule,
  FlowDefinition,
  FlowStepDef,
} from "../../lib/qualification/flow-runtime";
import { normalizeFlowDefinition } from "../../lib/qualification/flow-runtime";
import { AdminField, AdminInput, AdminSelect, AdminTextarea } from "./ui";

const STEP_TYPES = [
  { value: "text", label: "Texto", icon: Type },
  { value: "email", label: "E-mail", icon: Mail },
  { value: "phone_br", label: "Telefone", icon: Phone },
  { value: "number_or_choice", label: "Número / chips", icon: Hash },
  { value: "multi_choice", label: "Múltipla escolha", icon: ListChecks },
  { value: "single_choice_cards", label: "Cards", icon: LayoutGrid },
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

const DEFAULT_SCORE = { coldMax: 24, warmMax: 49, hotMax: 74 };
const DEFAULT_DELAY = 900;

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

  useEffect(() => {
    setFormName(displayName(value.name));
  }, [value.name]);

  const steps = value.steps || [];
  const branch = value.branching?.[0];
  const score = { ...DEFAULT_SCORE, ...(value.leadScore || {}) };
  const ai = value.ai || {};
  const delay = value.chat?.messageDelayMs ?? DEFAULT_DELAY;

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

  const sidebarTabs: Array<{ id: SidebarTab; label: string; icon: typeof Gauge }> = [
    { id: "score", label: "Score", icon: Gauge },
    { id: "visual", label: "Visual", icon: Palette },
    { id: "simulador", label: "Simulador", icon: Smartphone },
    { id: "json", label: "JSON", icon: Code2 },
  ];

  const bands = [
    {
      key: "cold",
      label: "Frio",
      range: `0–${score.coldMax} pts`,
      cls: "border-sky-200 bg-sky-50 text-sky-700",
    },
    {
      key: "warm",
      label: "Morno",
      range: `${score.coldMax + 1}–${score.warmMax} pts`,
      cls: "border-amber-200 bg-amber-50 text-amber-700",
    },
    {
      key: "hot",
      label: "Quente",
      range: `${score.warmMax + 1}–${score.hotMax} pts`,
      cls: "border-orange-200 bg-orange-50 text-orange-700",
    },
    {
      key: "very",
      label: "Muito quente",
      range: `${score.hotMax + 1} pts ou mais`,
      cls: "border-rose-200 bg-rose-50 text-rose-700",
    },
  ];

  function patchScore(patch: Partial<typeof DEFAULT_SCORE>) {
    patchRoot({ leadScore: { ...score, ...patch } });
  }

  return (
    <div className="grid w-full items-start gap-5 xl:grid-cols-[minmax(0,1fr)_min(400px,32%)]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold tracking-tight text-foreground">
            Identidade
          </h2>
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
                value={value.description || ""}
                onChange={(e) => patchRoot({ description: e.target.value })}
                placeholder="Para uso interno da equipe"
              />
            </AdminField>
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-bold tracking-tight text-foreground">
                Fluxo da conversa
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Monte a conversa etapa a etapa. Expanda um bloco para editar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => insertStep(steps.length)}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar bloco
            </button>
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground/70">
            Arraste pelo ícone para reordenar as perguntas.
          </p>

          <div className="space-y-1">
            {steps.map((step, i) => {
              const open = expanded === step.key;
              const meta = typeMeta(String(step.type));
              const Icon = meta.icon;
              const mode = optionsMode(String(step.type));
              const title =
                step.bot_text || STEP_LABELS[step.key] || step.key;

              return (
                <div key={step.key}>
                  {i > 0 && (
                    <div className="flex justify-center py-1">
                      <button
                        type="button"
                        onClick={() => insertStep(i)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground/70 transition hover:bg-primary/8 hover:text-primary"
                      >
                        <Plus className="h-3 w-3" />
                        Adicionar bloco
                      </button>
                    </div>
                  )}

                  <div
                    className={`overflow-hidden rounded-xl border transition ${
                      open
                        ? "border-primary/40 bg-white shadow-[var(--shadow-surface-sm)]"
                        : "border-border/55 bg-white hover:border-border"
                    }`}
                  >
                    <div className="flex items-center gap-2 pl-2.5 pr-3">
                      <div className="flex flex-col items-center text-muted-foreground/40">
                        <button
                          type="button"
                          className="rounded p-0.5 hover:text-foreground disabled:opacity-20"
                          disabled={i === 0}
                          onClick={() => moveStep(step.key, -1)}
                          aria-label="Subir"
                        >
                          <span className="block text-[9px] leading-none">▲</span>
                        </button>
                        <GripVertical className="h-3.5 w-3.5" />
                        <button
                          type="button"
                          className="rounded p-0.5 hover:text-foreground disabled:opacity-20"
                          disabled={i === steps.length - 1}
                          onClick={() => moveStep(step.key, 1)}
                          aria-label="Descer"
                        >
                          <span className="block text-[9px] leading-none">▼</span>
                        </button>
                      </div>

                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>

                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                        onClick={() => setExpanded(open ? null : step.key)}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" strokeWidth={2.1} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-foreground">
                            {title}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {meta.label}
                          </span>
                        </span>
                      </button>

                      <input
                        className="hidden w-40 shrink-0 rounded-lg border border-dashed border-border/70 bg-transparent px-2.5 py-1.5 text-[11px] text-muted-foreground outline-none transition placeholder:text-muted-foreground/50 focus:border-primary focus:text-foreground lg:block"
                        value={step.key}
                        placeholder="Rótulo interno…"
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
                        aria-label="Rótulo interno"
                      />

                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : step.key)}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
                        aria-label="Expandir"
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {open && (
                      <div className="space-y-3 border-t border-border/50 bg-[#fbfcfd] px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <AdminField label="Tipo">
                            <AdminSelect
                              value={String(step.type)}
                              onChange={(e) =>
                                updateStep(step.key, { type: e.target.value })
                              }
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
          <div className="grid grid-cols-4 border-b border-border/50">
            {sidebarTabs.map((tab) => {
              const TabIcon = tab.icon;
              const activeTab = sidebar === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSidebar(tab.id)}
                  className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide transition ${
                    activeTab
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TabIcon className="h-4 w-4" strokeWidth={2.1} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {sidebar === "score" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-foreground">
                    Lead score
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Defina o teto de cada faixa. O lead é classificado ao concluir o
                    formulário.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <ScoreInput
                    label="Até (frio)"
                    value={score.coldMax}
                    onChange={(v) => patchScore({ coldMax: v })}
                  />
                  <ScoreInput
                    label="Até (morno)"
                    value={score.warmMax}
                    onChange={(v) => patchScore({ warmMax: v })}
                  />
                  <ScoreInput
                    label="Até (quente)"
                    value={score.hotMax}
                    onChange={(v) => patchScore({ hotMax: v })}
                  />
                </div>

                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Como fica a classificação
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {bands.map((b) => (
                      <div
                        key={b.key}
                        className={`rounded-xl border px-3 py-2.5 ${b.cls}`}
                      >
                        <div className="text-[13px] font-bold">{b.label}</div>
                        <div className="text-[11px] opacity-80">{b.range}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <AdminField label="Prompt do sistema (IA)">
                  <AdminTextarea
                    className="min-h-24 text-[13px]"
                    placeholder="Instruções para a IA gerar o resumo executivo do lead…"
                    value={ai.systemPrompt || ""}
                    onChange={(e) =>
                      patchRoot({ ai: { ...ai, systemPrompt: e.target.value } })
                    }
                  />
                </AdminField>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 text-[13px] text-foreground">
                    <input
                      type="checkbox"
                      checked={ai.summaryOnComplete !== false}
                      onChange={(e) =>
                        patchRoot({
                          ai: { ...ai, summaryOnComplete: e.target.checked },
                        })
                      }
                      className="accent-primary"
                    />
                    Gerar resumo com IA ao concluir
                  </label>
                  <label className="flex items-center gap-2.5 text-[13px] text-foreground">
                    <input
                      type="checkbox"
                      checked={ai.crmHandoff !== false}
                      onChange={(e) =>
                        patchRoot({ ai: { ...ai, crmHandoff: e.target.checked } })
                      }
                      className="accent-primary"
                    />
                    Enviar handoff para o CRM
                  </label>
                </div>

                <AdminField label="Delay entre mensagens (ms)">
                  <AdminInput
                    type="number"
                    min={0}
                    max={60000}
                    value={delay}
                    onChange={(e) =>
                      patchRoot({
                        chat: {
                          ...value.chat,
                          messageDelayMs: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </AdminField>

                <details className="rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
                  <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Regra de oferta (Muratori)
                  </summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Valores listados seguem para{" "}
                      <strong className="text-foreground">oferta</strong>; os demais vão
                      para WhatsApp.
                    </p>
                    <AdminField label="Campo">
                      <AdminInput
                        value={branch?.when?.field || "revenue_level"}
                        onChange={(e) =>
                          setBranch({
                            when: {
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
                </details>
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
              </div>
            )}

            {sidebar === "simulador" && (
              <div>
                <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                  Prévia do fluxo — as bolhas seguem os blocos configurados.
                </p>
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
              </div>
            )}

            {sidebar === "json" && (
              <AdminTextarea
                className="min-h-[420px] font-mono text-[11px] leading-relaxed"
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

function ScoreInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-center text-sm font-semibold text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
      />
    </label>
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
