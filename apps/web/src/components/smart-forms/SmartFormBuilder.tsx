import { useMemo, useState } from "react";
import {
  ChevronDown,
  Gauge,
  Globe2,
  GripVertical,
  Link2,
  Mail,
  MessageSquareText,
  Palette,
  Phone,
  Plus,
  Smartphone,
  Type,
  Hash,
  ListChecks,
  LayoutGrid,
  CheckCircle2,
  Shield,
  ExternalLink,
  CircleDot,
} from "lucide-react";
import type {
  FormSettings,
  SmartFormDefinition,
  SmartFormNode,
  SmartFormRecord,
} from "../../lib/smart-forms/types";
import {
  BLOCK_META,
  PRIMARY_SWATCHES,
  coerceSettings,
  newNodeId,
} from "../../lib/smart-forms/types";
import { AdminField, AdminInput, AdminSelect, AdminTextarea } from "../admin/ui";
import { DraftSimulator } from "./DraftSimulator";
import { smartFormsApi } from "../../lib/smart-forms-api";
import { toast } from "sonner";

type SidebarTab = "score" | "visual" | "simulador" | "pixels" | "dominio";

const ADDABLE = [
  "message",
  "text",
  "email",
  "phone",
  "buttons",
  "single_choice",
  "multiple_choice",
  "number",
  "lgpd",
  "confirmation",
  "redirect",
] as const;

const ICONS: Record<string, typeof Type> = {
  message: MessageSquareText,
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  buttons: LayoutGrid,
  single_choice: CircleDot,
  multiple_choice: ListChecks,
  confirmation: CheckCircle2,
  lgpd: Shield,
  redirect: ExternalLink,
};

type Props = {
  form: SmartFormRecord;
  definition: SmartFormDefinition;
  settings: FormSettings;
  onDefinition: (next: SmartFormDefinition) => void;
  onSettings: (next: FormSettings) => void;
  onMeta: (patch: Partial<SmartFormRecord>) => void;
  domains: Array<Record<string, unknown>>;
  onAddDomain: (hostname: string) => void;
  onDeleteDomain: (id: string) => void;
  onVerifyDomain: (id: string) => void;
};

export function SmartFormBuilder({
  form,
  definition,
  settings,
  onDefinition,
  onSettings,
  onMeta,
  domains,
  onAddDomain,
  onDeleteDomain,
  onVerifyDomain,
}: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sidebar, setSidebar] = useState<SidebarTab>("score");
  const [domainHost, setDomainHost] = useState("");
  const theme = settings.theme || {};
  const tracking = settings.tracking || {};
  const webhook = settings.webhook || {};
  const nodes = definition.nodes;

  const tabs: Array<{ id: SidebarTab; label: string; icon: typeof Gauge }> = [
    { id: "score", label: "Score", icon: Gauge },
    { id: "visual", label: "Visual", icon: Palette },
    { id: "simulador", label: "Simulador", icon: Smartphone },
    { id: "pixels", label: "Pixels", icon: Globe2 },
    { id: "dominio", label: "Domínio", icon: Link2 },
  ];

  const bands = useMemo(
    () => [
      {
        label: "Frio",
        range: `0–${form.scoreColdMax} pts`,
        cls: "border-sky-200 bg-sky-50 text-sky-700",
      },
      {
        label: "Morno",
        range: `${form.scoreColdMax + 1}–${form.scoreWarmMax} pts`,
        cls: "border-amber-200 bg-amber-50 text-amber-800",
      },
      {
        label: "Quente",
        range: `${form.scoreWarmMax + 1}–${form.scoreHotMax} pts`,
        cls: "border-orange-200 bg-orange-50 text-orange-700",
      },
      {
        label: "Muito quente",
        range: `${form.scoreHotMax + 1} pts ou mais`,
        cls: "border-rose-200 bg-rose-50 text-rose-700",
      },
    ],
    [form.scoreColdMax, form.scoreWarmMax, form.scoreHotMax]
  );

  function setNodes(nextNodes: SmartFormNode[], edges = definition.edges) {
    const startNodeId =
      nextNodes.some((n) => n.id === definition.startNodeId)
        ? definition.startNodeId
        : nextNodes[0]?.id || "welcome";
    onDefinition({ ...definition, startNodeId, nodes: nextNodes, edges });
  }

  function updateNode(id: string, patch: Partial<SmartFormNode>) {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function moveNode(id: string, dir: -1 | 1) {
    const idx = nodes.findIndex((n) => n.id === id);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= nodes.length) return;
    const copy = [...nodes];
    const [item] = copy.splice(idx, 1);
    copy.splice(next, 0, item);
    const edges = copy.slice(0, -1).map((n, i) => ({
      id: `e_${n.id}_${copy[i + 1].id}`,
      from: n.id,
      to: copy[i + 1].id,
    }));
    setNodes(copy, edges);
  }

  function insertNode(at: number, type: string = "text") {
    const id = newNodeId(type === "message" ? "msg" : "n");
    const defaults: Partial<SmartFormNode> = {
      id,
      type,
      title:
        type === "message"
          ? "Nova mensagem…"
          : type === "confirmation"
            ? "Obrigado!"
            : "Nova pergunta…",
      required: type !== "message",
      mapTo:
        type === "text"
          ? "fullName"
          : type === "email"
            ? "email"
            : type === "phone"
              ? "phone"
              : undefined,
      options:
        type === "buttons" || type === "single_choice" || type === "multiple_choice"
          ? [
              { id: "o1", label: "Opção A", value: "a" },
              { id: "o2", label: "Opção B", value: "b" },
            ]
          : undefined,
    };
    const copy = [...nodes];
    copy.splice(at, 0, defaults as SmartFormNode);
    const edges = copy.slice(0, -1).map((n, i) => ({
      id: `e_${n.id}_${copy[i + 1].id}`,
      from: n.id,
      to: copy[i + 1].id,
    }));
    setNodes(copy, edges);
    setExpanded(id);
  }

  function removeNode(id: string) {
    if (nodes.length <= 1) return;
    const copy = nodes.filter((n) => n.id !== id);
    const edges = copy.slice(0, -1).map((n, i) => ({
      id: `e_${n.id}_${copy[i + 1].id}`,
      from: n.id,
      to: copy[i + 1].id,
    }));
    setNodes(copy, edges);
    if (expanded === id) setExpanded(null);
  }

  function patchSettings(patch: FormSettings) {
    onSettings({ ...settings, ...patch });
  }

  const primary = theme.primaryColor || "#128c7e";

  return (
    <div className="grid w-full items-start gap-5 xl:grid-cols-[minmax(0,1fr)_min(420px,34%)]">
      <div className="min-w-0 space-y-5">
        <section className="rounded-2xl border border-border/60 bg-white p-5 shadow-[var(--shadow-surface-sm)] sm:p-6">
          <h2 className="mb-4 text-[15px] font-bold tracking-tight text-foreground">
            Identidade
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminField label="Nome">
              <AdminInput
                value={form.name}
                onChange={(e) => onMeta({ name: e.target.value })}
              />
            </AdminField>
            <AdminField label="Descrição">
              <AdminInput
                value={form.description || ""}
                onChange={(e) => onMeta({ description: e.target.value })}
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
            <div className="relative">
              <details className="group">
                <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:brightness-110">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar bloco
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg">
                  {ADDABLE.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="flex w-full px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => insertNode(nodes.length, t)}
                    >
                      {BLOCK_META[t]?.label || t}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>
          <p className="mb-4 text-[11px] text-muted-foreground/70">
            Use as setas para reordenar. O fluxo linear conecta os blocos em sequência.
          </p>

          <div className="space-y-1">
            {nodes.map((node, i) => {
              const open = expanded === node.id;
              const meta = BLOCK_META[node.type] || { label: node.type };
              const Icon = ICONS[node.type] || Type;
              return (
                <div key={node.id}>
                  {i > 0 && (
                    <div className="flex justify-center py-1">
                      <button
                        type="button"
                        onClick={() => insertNode(i)}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-muted-foreground/70 hover:bg-primary/8 hover:text-primary"
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
                          disabled={i === 0}
                          className="disabled:opacity-20"
                          onClick={() => moveNode(node.id, -1)}
                        >
                          <span className="text-[9px]">▲</span>
                        </button>
                        <GripVertical className="h-3.5 w-3.5" />
                        <button
                          type="button"
                          disabled={i === nodes.length - 1}
                          className="disabled:opacity-20"
                          onClick={() => moveNode(node.id, 1)}
                        >
                          <span className="text-[9px]">▼</span>
                        </button>
                      </div>
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
                        {i + 1}
                      </span>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left"
                        onClick={() => setExpanded(open ? null : node.id)}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] font-semibold text-foreground">
                            {node.title || meta.label}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {meta.label}
                          </span>
                        </span>
                      </button>
                      <input
                        className="hidden w-40 shrink-0 rounded-lg border border-dashed border-border/70 bg-transparent px-2.5 py-1.5 text-[11px] text-muted-foreground outline-none focus:border-primary lg:block"
                        value={node.internalName || ""}
                        placeholder="Rótulo interno…"
                        onChange={(e) =>
                          updateNode(node.id, { internalName: e.target.value })
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : node.id)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
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
                              value={node.type}
                              onChange={(e) =>
                                updateNode(node.id, { type: e.target.value })
                              }
                            >
                              {ADDABLE.map((t) => (
                                <option key={t} value={t}>
                                  {BLOCK_META[t]?.label || t}
                                </option>
                              ))}
                            </AdminSelect>
                          </AdminField>
                          <AdminField label="mapTo (lead)">
                            <AdminInput
                              value={node.mapTo || ""}
                              placeholder="fullName | email | phone | custom:chave"
                              onChange={(e) =>
                                updateNode(node.id, {
                                  mapTo: e.target.value || undefined,
                                })
                              }
                            />
                          </AdminField>
                        </div>
                        <AdminField label="Título / pergunta">
                          <AdminInput
                            value={node.title || ""}
                            onChange={(e) =>
                              updateNode(node.id, { title: e.target.value })
                            }
                          />
                        </AdminField>
                        <AdminField label="Descrição" hint="Suporta {{fullName}} {{email}}">
                          <AdminTextarea
                            className="min-h-20"
                            value={node.description || ""}
                            onChange={(e) =>
                              updateNode(node.id, { description: e.target.value })
                            }
                          />
                        </AdminField>
                        {!["message", "confirmation", "redirect", "buttons"].includes(
                          node.type
                        ) && (
                          <AdminField label="Placeholder">
                            <AdminInput
                              value={node.placeholder || ""}
                              onChange={(e) =>
                                updateNode(node.id, { placeholder: e.target.value })
                              }
                            />
                          </AdminField>
                        )}
                        {(node.type === "buttons" ||
                          node.type === "single_choice" ||
                          node.type === "multiple_choice") && (
                          <AdminField label="Opções (label | value | score)">
                            <AdminTextarea
                              className="min-h-28 font-mono text-xs"
                              value={(node.options || [])
                                .map((o) =>
                                  [o.label, o.value, o.scoreDelta ?? ""]
                                    .filter((x) => x !== "")
                                    .join(" | ")
                                )
                                .join("\n")}
                              onChange={(e) => {
                                const options = e.target.value
                                  .split("\n")
                                  .map((l) => l.trim())
                                  .filter(Boolean)
                                  .map((line, idx) => {
                                    const [label, value, score] = line
                                      .split("|")
                                      .map((p) => p.trim());
                                    return {
                                      id: `o${idx + 1}`,
                                      label: label || `Opção ${idx + 1}`,
                                      value:
                                        value ||
                                        (label || `opt_${idx + 1}`)
                                          .toLowerCase()
                                          .replace(/\s+/g, "_"),
                                      scoreDelta: score ? Number(score) : undefined,
                                    };
                                  });
                                updateNode(node.id, { options });
                              }}
                            />
                          </AdminField>
                        )}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <AdminField label="Score delta">
                            <AdminInput
                              type="number"
                              value={node.scoreDelta ?? 0}
                              onChange={(e) =>
                                updateNode(node.id, {
                                  scoreDelta: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </AdminField>
                          {(node.type === "confirmation" || node.type === "redirect") && (
                            <AdminField label="Redirect URL">
                              <AdminInput
                                value={node.redirectUrl || ""}
                                onChange={(e) =>
                                  updateNode(node.id, {
                                    redirectUrl: e.target.value || undefined,
                                  })
                                }
                              />
                            </AdminField>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="accent-primary"
                              checked={node.required !== false}
                              onChange={(e) =>
                                updateNode(node.id, { required: e.target.checked })
                              }
                            />
                            Obrigatório
                          </label>
                          <button
                            type="button"
                            className="text-xs font-semibold text-destructive hover:underline"
                            onClick={() => removeNode(node.id)}
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
          <div className="grid grid-cols-5 border-b border-border/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = sidebar === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSidebar(tab.id)}
                  className={`flex flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wide ${
                    active
                      ? "border-b-2 border-primary text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="max-h-[min(78vh,820px)] overflow-y-auto p-5">
            {sidebar === "score" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Lead score</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Defina o teto de cada faixa. O lead é classificado ao concluir.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["scoreColdMax", "Até (frio)", form.scoreColdMax],
                      ["scoreWarmMax", "Até (morno)", form.scoreWarmMax],
                      ["scoreHotMax", "Até (quente)", form.scoreHotMax],
                    ] as const
                  ).map(([key, label, value]) => (
                    <label key={key} className="block">
                      <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                        {label}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={value}
                        onChange={(e) =>
                          onMeta({ [key]: Number(e.target.value) || 0 } as Partial<SmartFormRecord>)
                        }
                        className="mt-1 w-full rounded-lg border border-input px-2.5 py-2 text-center text-sm font-semibold outline-none focus:border-primary"
                      />
                    </label>
                  ))}
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Como fica a classificação
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {bands.map((b) => (
                      <div
                        key={b.label}
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
                    value={form.aiSystemPrompt || ""}
                    onChange={(e) => onMeta({ aiSystemPrompt: e.target.value })}
                  />
                </AdminField>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 text-[13px]">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={form.aiEnabled}
                      onChange={(e) => onMeta({ aiEnabled: e.target.checked })}
                    />
                    Gerar resumo com IA ao concluir
                  </label>
                  <label className="flex items-center gap-2.5 text-[13px]">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={form.crmSyncEnabled}
                      onChange={(e) => onMeta({ crmSyncEnabled: e.target.checked })}
                    />
                    Enviar handoff para o CRM
                  </label>
                </div>
                <AdminField label="Delay entre mensagens (ms)">
                  <AdminInput
                    type="number"
                    min={0}
                    value={settings.chat?.messageDelayMs ?? 900}
                    onChange={(e) =>
                      patchSettings({
                        chat: {
                          ...settings.chat,
                          messageDelayMs: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </AdminField>
              </div>
            )}

            {sidebar === "visual" && (
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-bold">Aparência e SEO</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Cores e textos do chat público.
                  </p>
                </div>
                <div
                  className="overflow-hidden rounded-2xl border border-black/5"
                  style={{ background: theme.pageBackgroundColor || "#f1f3f6" }}
                >
                  <div
                    className="px-3 py-2.5 text-white"
                    style={{ background: primary }}
                  >
                    <div className="text-[13px] font-semibold">{form.name}</div>
                    <div className="text-[10px] text-white/75">
                      {theme.headerSubtitle || "diagnóstico online"}
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="max-w-[90%] rounded-2xl rounded-bl-sm bg-white px-3 py-2 text-[12px] shadow-sm">
                      {nodes[0]?.title || "Olá!"}
                    </div>
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
                      style={{ background: primary }}
                    >
                      Quero saber mais
                    </button>
                  </div>
                </div>
                <AdminField label="Cor primária">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={primary}
                      onChange={(e) =>
                        patchSettings({
                          theme: { ...theme, primaryColor: e.target.value },
                        })
                      }
                      className="h-9 w-12 cursor-pointer rounded border border-border"
                    />
                    <AdminInput
                      value={primary}
                      onChange={(e) =>
                        patchSettings({
                          theme: { ...theme, primaryColor: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRIMARY_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="h-7 w-7 rounded-full border border-black/10"
                        style={{ background: c }}
                        onClick={() =>
                          patchSettings({ theme: { ...theme, primaryColor: c } })
                        }
                      />
                    ))}
                  </div>
                </AdminField>
                <AdminField label="Status do header">
                  <AdminInput
                    value={theme.headerSubtitle || ""}
                    placeholder="diagnóstico online"
                    onChange={(e) =>
                      patchSettings({
                        theme: { ...theme, headerSubtitle: e.target.value },
                      })
                    }
                  />
                </AdminField>
                <AdminField label="Mensagem de encerramento (fallback)">
                  <AdminInput
                    value={theme.completionBannerText || ""}
                    placeholder="Formulário concluído"
                    onChange={(e) =>
                      patchSettings({
                        theme: { ...theme, completionBannerText: e.target.value },
                      })
                    }
                  />
                </AdminField>
                <AssetField
                  label="Logo do chat"
                  value={theme.logoUrl || ""}
                  onChange={(url) =>
                    patchSettings({ theme: { ...theme, logoUrl: url || undefined } })
                  }
                />
                <AssetField
                  label="Wallpaper da conversa"
                  value={theme.chatWallpaperUrl || ""}
                  onChange={(url) =>
                    patchSettings({
                      theme: { ...theme, chatWallpaperUrl: url || undefined },
                    })
                  }
                />
                <label className="flex items-center gap-2.5 text-[13px]">
                  <input
                    type="checkbox"
                    className="accent-primary"
                    checked={theme.chatWallpaperPattern !== false}
                    onChange={(e) =>
                      patchSettings({
                        theme: {
                          ...theme,
                          chatWallpaperPattern: e.target.checked,
                        },
                      })
                    }
                  />
                  Textura padrão WhatsApp
                </label>
                <div className="border-t border-border/50 pt-4">
                  <h4 className="mb-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    SEO / Compartilhamento
                  </h4>
                  <AdminField label="Título SEO">
                    <AdminInput
                      value={settings.seo?.title || ""}
                      onChange={(e) =>
                        patchSettings({
                          seo: { ...settings.seo, title: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <div className="mt-3">
                    <AdminField label="Descrição SEO">
                      <AdminTextarea
                        className="min-h-20"
                        value={settings.seo?.description || ""}
                        placeholder="Texto curto para Google e preview de link…"
                        onChange={(e) =>
                          patchSettings({
                            seo: { ...settings.seo, description: e.target.value },
                          })
                        }
                      />
                    </AdminField>
                  </div>
                  <div className="mt-3">
                    <AssetField
                      label="OG Image"
                      value={settings.seo?.ogImage || ""}
                      onChange={(url) =>
                        patchSettings({
                          seo: { ...settings.seo, ogImage: url || undefined },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {sidebar === "simulador" && (
              <DraftSimulator
                definition={definition}
                formName={form.name}
                primaryColor={primary}
                settings={settings}
              />
            )}

            {sidebar === "pixels" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold">Eventos e pixels</h3>
                <div className="space-y-3 rounded-xl border border-border/60 p-3">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Google
                  </p>
                  <AdminField label="Google Tag Manager">
                    <AdminInput
                      placeholder="GTM-XXXX"
                      value={tracking.gtmContainerId || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: { ...tracking, gtmContainerId: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Google Analytics (G-)">
                    <AdminInput
                      placeholder="G-XXXX"
                      value={tracking.gaMeasurementId || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: { ...tracking, gaMeasurementId: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Google Ads Conversion ID">
                    <AdminInput
                      placeholder="AW-…"
                      value={tracking.googleAdsConversionId || tracking.googleAdsId || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: {
                            ...tracking,
                            googleAdsConversionId: e.target.value,
                            googleAdsId: e.target.value,
                          },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Rótulo de conversão">
                    <AdminInput
                      value={tracking.googleAdsConversionLabel || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: {
                            ...tracking,
                            googleAdsConversionLabel: e.target.value,
                          },
                        })
                      }
                    />
                  </AdminField>
                </div>

                <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                  <p className="text-[11px] font-bold uppercase text-amber-800">
                    Filtrar conversão no Ads e Meta
                  </p>
                  {(
                    [
                      ["ALL", "Qualquer lead que terminar"],
                      ["WARM", "A partir de morno"],
                      ["HOT", "Só quente ou muito quente (recomendado)"],
                      ["VERY_HOT", "Só muito quente"],
                    ] as const
                  ).map(([val, label]) => (
                    <label
                      key={val}
                      className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-[13px] ${
                        (tracking.conversionMinTemperature || "ALL") === val
                          ? "border-primary bg-primary/8"
                          : "border-border/60 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="convMin"
                        className="mt-1 accent-primary"
                        checked={(tracking.conversionMinTemperature || "ALL") === val}
                        onChange={() =>
                          patchSettings({
                            tracking: {
                              ...tracking,
                              conversionMinTemperature: val,
                            },
                          })
                        }
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 p-3">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">
                    Facebook / Meta
                  </p>
                  <AdminField label="Facebook Pixel ID">
                    <AdminInput
                      value={tracking.facebookPixelId || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: { ...tracking, facebookPixelId: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Meta CAPI Access Token">
                    <AdminInput
                      type="password"
                      placeholder="Token do Events Manager (server)"
                      value={tracking.metaCapiAccessToken || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: {
                            ...tracking,
                            metaCapiAccessToken: e.target.value,
                          },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Código de teste CAPI">
                    <AdminInput
                      value={tracking.metaCapiTestEventCode || ""}
                      onChange={(e) =>
                        patchSettings({
                          tracking: {
                            ...tracking,
                            metaCapiTestEventCode: e.target.value,
                          },
                        })
                      }
                    />
                  </AdminField>
                </div>

                <div className="space-y-3 rounded-xl border border-border/60 p-3">
                  <label className="flex items-center gap-2 text-[13px] font-semibold">
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={Boolean(webhook.enabled)}
                      onChange={(e) =>
                        patchSettings({
                          webhook: { ...webhook, enabled: e.target.checked },
                        })
                      }
                    />
                    Enviar webhook ao concluir
                  </label>
                  <AdminField label="URL do webhook">
                    <AdminInput
                      placeholder="https://hooks.example.com/lead"
                      value={webhook.url || ""}
                      onChange={(e) =>
                        patchSettings({
                          webhook: { ...webhook, url: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                  <AdminField label="Segredo HMAC (opcional)">
                    <AdminInput
                      value={webhook.secret || ""}
                      placeholder="opcional"
                      onChange={(e) =>
                        patchSettings({
                          webhook: { ...webhook, secret: e.target.value },
                        })
                      }
                    />
                  </AdminField>
                </div>
              </div>
            )}

            {sidebar === "dominio" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold">Domínio próprio</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Para o cliente: 1 CNAME + cadastrar aqui. SSL sobe depois.
                  </p>
                </div>
                <ol className="space-y-1.5 text-xs text-muted-foreground">
                  <li>1. No DNS: CNAME → app.muratorimkt.com.br</li>
                  <li>2. Cole o hostname e clique em Adicionar</li>
                  <li>3. Status Ativo quando o DNS propagar</li>
                </ol>
                <div className="rounded-xl bg-muted/50 px-3 py-2.5 text-center font-mono text-xs">
                  CNAME → app.muratorimkt.com.br
                </div>
                <AdminField label="Hostname">
                  <div className="flex gap-2">
                    <AdminInput
                      placeholder="forms.suaempresa.com.br"
                      value={domainHost}
                      onChange={(e) => setDomainHost(e.target.value)}
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground"
                      onClick={() => {
                        if (!domainHost.trim()) return;
                        onAddDomain(domainHost.trim());
                        setDomainHost("");
                      }}
                    >
                      Adicionar
                    </button>
                  </div>
                </AdminField>
                {domains.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum domínio cadastrado neste formulário.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {domains.map((d) => (
                      <li
                        key={String(d.id)}
                        className="rounded-xl border border-border/60 px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">{String(d.hostname)}</div>
                            <div className="text-muted-foreground">{String(d.status)}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="font-semibold text-primary hover:underline"
                              onClick={() => onVerifyDomain(String(d.id))}
                            >
                              Verificar
                            </button>
                            <button
                              type="button"
                              className="text-destructive hover:underline"
                              onClick={() => onDeleteDomain(String(d.id))}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function AssetField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function onFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma imagem");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Máx. 8 MB");
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      const res = await smartFormsApi.uploadAsset(dataUrl);
      onChange(res.url);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <AdminField label={label}>
      <div className="space-y-2">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/80 bg-muted/30 px-3 py-4 text-center hover:border-primary/40">
          <span className="text-xs font-semibold text-foreground">
            {uploading ? "Enviando…" : "Arraste ou clique · PNG, JPG, WebP · máx. 8 MB"}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void onFile(e.target.files?.[0] || null)}
          />
        </label>
        {value ? (
          <div className="flex items-center gap-2">
            <img
              src={value}
              alt=""
              className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
            />
            <button
              type="button"
              className="text-[11px] font-semibold text-destructive hover:underline"
              onClick={() => onChange("")}
            >
              Remover
            </button>
          </div>
        ) : null}
        <AdminInput
          placeholder="https://… ou envie acima"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </AdminField>
  );
}

export { coerceSettings };
