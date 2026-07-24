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
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { smartFormsApi } from "../../../lib/smart-forms-api";
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

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  "agencia-marketing": Briefcase,
  "clinica-saude": Stethoscope,
  imobiliaria: Home,
  advocacia: Scale,
  estetica: Sparkles,
  "academia-fitness": Dumbbell,
  consultoria: Building2,
  "assistencia-tecnica": Wrench,
  infoproduto: GraduationCap,
};

const TINT_BY_CATEGORY: Record<string, string> = {
  Marketing: "bg-orange-50",
  Saúde: "bg-emerald-50",
  Imóveis: "bg-sky-50",
  Jurídico: "bg-violet-50",
  Beleza: "bg-pink-50",
  Fitness: "bg-lime-50",
  Serviços: "bg-slate-100",
  Digital: "bg-indigo-50",
};

type Card = {
  id: string;
  name: string;
  category: string;
  description: string;
  steps: number;
  icon: LucideIcon;
  tint: string;
  apiId: string;
};

export function SmartTemplatesPage() {
  const navigate = useNavigate();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("Todos");
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    void smartFormsApi
      .templates()
      .then((res) => {
        setCards(
          res.items.map((t) => {
            const def = t.definition as { nodes?: unknown[] } | undefined;
            const settings = (t.settings || {}) as { description?: string };
            const slug = String(t.slug || "");
            const category = String(t.category || "Marketing");
            return {
              id: String(t.id),
              apiId: String(t.id),
              name: String(t.name || "Template"),
              category,
              description:
                settings.description ||
                "Fluxo conversacional pronto — use e personalize no builder.",
              steps: Array.isArray(def?.nodes) ? def!.nodes!.length : 0,
              icon: ICON_BY_SLUG[slug] || HeartPulse,
              tint: TINT_BY_CATEGORY[category] || "bg-primary/8",
            };
          })
        );
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar templates"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (cat === "Todos") return cards;
    return cards.filter((c) => c.category === cat);
  }, [cards, cat]);

  async function useTemplate(card: Card) {
    setBusy(card.id);
    try {
      const form = await smartFormsApi.create({
        name: card.name,
        description: card.description,
        templateId: card.apiId,
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

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-border/60 bg-muted/40"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-border/60 bg-white px-4 py-8 text-sm text-muted-foreground">
          Nenhum template nesta categoria.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((card) => {
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
                  {busy === card.id ? "Criando…" : "Usar template"}
                </AdminButton>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
