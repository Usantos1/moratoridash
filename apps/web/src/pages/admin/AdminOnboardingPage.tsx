import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";

type Branding = {
  brandName: string;
  assistantName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
};

type Business = {
  segment: string;
  description: string;
  audience: string;
  averageTicket: string;
};

type Tracking = {
  gtmId: string;
  ga4MeasurementId: string;
  googleAdsId: string;
  googleAdsConversionLabel: string;
  metaPixelId: string;
};

const emptyBranding: Branding = {
  brandName: "",
  assistantName: "",
  primaryColor: "#075e54",
  secondaryColor: "#128c7e",
  logoUrl: "",
};

const emptyBusiness: Business = {
  segment: "agencia_marketing",
  description: "",
  audience: "",
  averageTicket: "",
};

const emptyTracking: Tracking = {
  gtmId: "",
  ga4MeasurementId: "",
  googleAdsId: "",
  googleAdsConversionLabel: "",
  metaPixelId: "",
};

export function AdminOnboardingPage() {
  const [branding, setBranding] = useState<Branding>(emptyBranding);
  const [business, setBusiness] = useState<Business>(emptyBusiness);
  const [tracking, setTracking] = useState<Tracking>(emptyTracking);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminApi
      .settings()
      .then((s) => {
        setBranding({ ...emptyBranding, ...(s.branding as Partial<Branding>) });
        setBusiness({ ...emptyBusiness, ...(s.business as Partial<Business>) });
        setTracking({ ...emptyTracking, ...(s.tracking as Partial<Tracking>) });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar"));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminApi.saveSettings({ branding, business, tracking });
      toast.success("Configuração salva");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-extrabold">Marca e negócio</h1>
        <p className="mt-1 text-sm text-white/55">
          Aplica no chat em runtime — sem redeploy. Tokens secretos ficam só no servidor.
        </p>
      </div>

      <section className="space-y-4 border border-white/10 bg-[#0e1614] p-5">
        <h2 className="font-display text-xl font-bold">Marca</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Nome da marca"
            value={branding.brandName}
            onChange={(brandName) => setBranding((b) => ({ ...b, brandName }))}
          />
          <Input
            label="Nome do assistente"
            value={branding.assistantName}
            placeholder="Muratori · IA"
            onChange={(assistantName) => setBranding((b) => ({ ...b, assistantName }))}
          />
          <Input
            label="Cor primária"
            value={branding.primaryColor}
            type="color-text"
            onChange={(primaryColor) => setBranding((b) => ({ ...b, primaryColor }))}
          />
          <Input
            label="Cor secundária"
            value={branding.secondaryColor}
            type="color-text"
            onChange={(secondaryColor) => setBranding((b) => ({ ...b, secondaryColor }))}
          />
          <Input
            label="URL do logo"
            value={branding.logoUrl}
            placeholder="https://…/logo.png"
            onChange={(logoUrl) => setBranding((b) => ({ ...b, logoUrl }))}
          />
        </div>

        <div className="flex items-center gap-3 border border-white/10 bg-black/20 p-3">
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white text-sm font-bold"
            style={{ color: branding.primaryColor }}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (branding.brandName[0] || "M").toUpperCase()
            )}
          </div>
          <div
            className="flex-1 px-3 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.assistantName || `${branding.brandName || "Marca"} · IA`}
          </div>
        </div>
      </section>

      <section className="space-y-4 border border-white/10 bg-[#0e1614] p-5">
        <h2 className="font-display text-xl font-bold">Negócio</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="Segmento"
            value={business.segment}
            onChange={(segment) => setBusiness((b) => ({ ...b, segment }))}
          />
          <Input
            label="Ticket médio por conta"
            value={business.averageTicket}
            placeholder="R$ 2.500/mês"
            onChange={(averageTicket) => setBusiness((b) => ({ ...b, averageTicket }))}
          />
          <Input
            label="Público-alvo"
            value={business.audience}
            placeholder="PMEs, clínicas, e-commerces…"
            onChange={(audience) => setBusiness((b) => ({ ...b, audience }))}
          />
          <Input
            label="Descrição curta"
            value={business.description}
            onChange={(description) => setBusiness((b) => ({ ...b, description }))}
          />
        </div>
      </section>

      <section className="space-y-4 border border-white/10 bg-[#0e1614] p-5">
        <h2 className="font-display text-xl font-bold">Tracking</h2>
        <p className="text-xs text-white/45">
          Somente IDs públicos. Access token do Meta e API secret do GA4 ficam no `.env` do servidor.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="GTM ID"
            value={tracking.gtmId}
            placeholder="GTM-XXXXXX"
            onChange={(gtmId) => setTracking((t) => ({ ...t, gtmId }))}
          />
          <Input
            label="GA4 Measurement ID"
            value={tracking.ga4MeasurementId}
            placeholder="G-XXXXXXX"
            onChange={(ga4MeasurementId) => setTracking((t) => ({ ...t, ga4MeasurementId }))}
          />
          <Input
            label="Google Ads ID"
            value={tracking.googleAdsId}
            placeholder="AW-XXXXXXX"
            onChange={(googleAdsId) => setTracking((t) => ({ ...t, googleAdsId }))}
          />
          <Input
            label="Google Ads label"
            value={tracking.googleAdsConversionLabel}
            onChange={(googleAdsConversionLabel) =>
              setTracking((t) => ({ ...t, googleAdsConversionLabel }))
            }
          />
          <Input
            label="Meta Pixel ID"
            value={tracking.metaPixelId}
            placeholder="somente números"
            onChange={(metaPixelId) => setTracking((t) => ({ ...t, metaPixelId }))}
          />
        </div>
      </section>

      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="bg-[var(--leaf)] px-6 py-3 text-sm font-bold text-[#0a140f] disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar configuração"}
      </button>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "color-text";
}) {
  return (
    <label className="block text-xs uppercase tracking-wide text-white/40">
      {label}
      <div className="mt-1 flex gap-2">
        {type === "color-text" && (
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#075e54"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-12 border border-white/10 bg-black/20"
          />
        )}
        <input
          className="w-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-[var(--leaf)]"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}
