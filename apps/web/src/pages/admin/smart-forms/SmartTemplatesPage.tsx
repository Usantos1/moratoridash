import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Building2,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Home,
  Scale,
  Sparkles,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
import { emptyDefinition } from "../../../lib/smart-forms/types";
import { FormsModuleNav } from "../../../components/admin/FormsModuleNav";
import { AdminButton } from "../../../components/admin/ui";

const CATEGORIES = [
  "Todos",
  "Marketing",
  "Saúde",
  "Imóveis",
  "Jurídico",
  "Beleza",
  "Fitness",
  "Serviços",
  "Digital",
] as const;

const FALLBACK_TEMPLATES = [
  {
    id: "local:marketing",
    name: "Agência de Marketing",
    category: "Marketing",
    description: "Diagnóstico B2B com score de qualificação e handoff comercial.",
    steps: 12,
    icon: Briefcase,
    tint: "bg-orange-50",
  },
  {
    id: "local:saude",
    name: "Clínica & Saúde",
    category: "Saúde",
    description: "Triagem de urgência, especialidade e convênio.",
    steps: 9,
    icon: Stethoscope,
    tint: "bg-emerald-50",
  },
  {
    id: "local:imoveis",
    name: "Imobiliária",
    category: "Imóveis",
    description: "Qualificação de compra/aluguel e faixa de investimento.",
    steps: 10,
    icon: Home,
    tint: "bg-sky-50",
  },
  {
    id: "local:juridico",
    name: "Escritório de Advocacia",
    category: "Jurídico",
    description: "Área do direito, urgência e qualificação do caso.",
    steps: 8,
    icon: Scale,
    tint: "bg-violet-50",
  },
  {
    id: "local:beleza",
    name: "Clínica de Estética",
    category: "Beleza",
    description: "Procedimento desejado, orçamento e agenda.",
    steps: 8,
    icon: Sparkles,
    tint: "bg-pink-50",
  },
  {
    id: "local:fitness",
    name: "Academia & Fitness",
    category: "Fitness",
    description: "Objetivo, plano e disponibilidade para treino.",
    steps: 7,
    icon: Dumbbell,
    tint: "bg-lime-50",
  },
  {
    id: "local:consultoria",
    name: "Consultoria Empresarial",
    category: "Serviços",
    description: "Dor do negócio, porte e maturidade digital.",
    steps: 11,
    icon: Building2,
    tint: "bg-amber-50",
  },
  {
    id: "local:assistencia",
    name: "Assistência Técnica",
    category: "Serviços",
    description: "Aparelho, problema e urgência de reparo.",
    steps: 9,
    icon: Wrench,
    tint: "bg-slate-100",
  },
  {
    id: "local:infoproduto",
    name: "Infoproduto & Cursos",
    category: "Digital",
    description: "Interesse, nível e prontidão de compra.",
    steps: 8,
    icon: GraduationCap,
    tint: "bg-indigo-50",
  },
];

type Card = {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: number;
  icon: typeof Briefcase;
  tint: string;
  apiId?: string;
};

export function SmartTemplatesPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [apiTemplates, setApiTemplates] = useState<Card[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void smartFormsApi
      .templates()
      .then((res) => {
        setApiTemplates(
          res.items.map((t) => {
            const def = t.definition as { nodes?: unknown[] } | undefined;
            return {
              id: `api:${String(t.id)}`,
              apiId: String(t.id),
              name: String(t.name || "Template"),
              category: String(t.category || "Marketing"),
              description: "Fluxo conversacional pronto — use e personalize no builder.",
              steps: Array.isArray(def?.nodes) ? def!.nodes!.length : 3,
              icon: HeartPulse,
              tint: "bg-primary/8",
            };
          })
        );
      })
      .catch(() => undefined);
  }, []);

  const cards = useMemo(() => {
    if (apiTemplates.length > 0) {
      if (cat === "Todos") return apiTemplates;
      return apiTemplates.filter((c) => c.category === cat);
    }
    const merged = FALLBACK_TEMPLATES;
    if (cat === "Todos") return merged;
    return merged.filter((c) => c.category === cat);
  }, [apiTemplates, cat]);

  async function useTemplate(card: Card) {
    setBusy(card.id);
    try {
      const form = await smartFormsApi.create({
        name: card.name,
        description: card.description,
        templateId: card.apiId,
        draftDefinition: card.apiId ? undefined : emptyDefinition(),
      });
      toast.success("Template aplicado");
      navigate(`/admin/forms/${form.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao usar template");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[1.85rem]">
            Templates
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Fluxos conversacionais prontos por segmento — use e personalize no builder.
          </p>
        </div>
        <FormsModuleNav />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              cat === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/70 bg-white text-muted-foreground hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.id}
              className={`flex flex-col rounded-2xl border border-border/60 p-5 shadow-[var(--shadow-surface-sm)] ${card.tint}`}
            >
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-foreground shadow-sm">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {card.category}
                </span>
              </div>
              <h2 className="text-[15px] font-bold text-foreground">{card.name}</h2>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">
                {card.description}
              </p>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{card.steps} etapas</span>
                <span>·</span>
                <span>Sistema</span>
              </div>
              <AdminButton
                className="mt-4 w-full"
                disabled={busy === card.id}
                onClick={() => void useTemplate(card)}
              >
                Usar template
              </AdminButton>
            </article>
          );
        })}
      </div>
    </div>
  );
}
