import { useEffect, useState } from "react";
import { toast } from "sonner";
import { adminApi } from "../../lib/admin-api";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminPageHeader,
  AdminPanel,
} from "../../components/admin/ui";

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
  primaryColor: "#128C7E",
  secondaryColor: "#0D655B",
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
      <AdminPageHeader
        title="Marca e negócio"
        description="Aplica no chat em runtime — sem redeploy. Tokens secretos ficam só no servidor."
        actions={
          <AdminButton disabled={saving} onClick={() => void save()}>
            {saving ? "Salvando…" : "Salvar configuração"}
          </AdminButton>
        }
      />

      <AdminPanel title="Marca" subtitle="Identidade vista no header do diagnóstico">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Nome da marca">
            <AdminInput
              value={branding.brandName}
              onChange={(e) => setBranding((b) => ({ ...b, brandName: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Nome do assistente">
            <AdminInput
              value={branding.assistantName}
              placeholder="Muratori · IA"
              onChange={(e) => setBranding((b) => ({ ...b, assistantName: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Cor primária">
            <div className="flex gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(branding.primaryColor) ? branding.primaryColor : "#128C7E"}
                onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
                className="h-11 w-12 border border-border bg-muted/40"
              />
              <AdminInput
                value={branding.primaryColor}
                onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
              />
            </div>
          </AdminField>
          <AdminField label="Cor secundária">
            <div className="flex gap-2">
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(branding.secondaryColor) ? branding.secondaryColor : "#128c7e"}
                onChange={(e) => setBranding((b) => ({ ...b, secondaryColor: e.target.value }))}
                className="h-11 w-12 border border-border bg-muted/40"
              />
              <AdminInput
                value={branding.secondaryColor}
                onChange={(e) => setBranding((b) => ({ ...b, secondaryColor: e.target.value }))}
              />
            </div>
          </AdminField>
          <AdminField label="URL do logo" hint="PNG/SVG público">
            <AdminInput
              value={branding.logoUrl}
              placeholder="https://…/logo.png"
              onChange={(e) => setBranding((b) => ({ ...b, logoUrl: e.target.value }))}
            />
          </AdminField>
        </div>

        <div className="mt-5 flex items-center gap-3 border border-border bg-muted/50 p-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/25 bg-white text-sm font-bold"
            style={{ color: branding.primaryColor }}
          >
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              (branding.brandName[0] || "M").toUpperCase()
            )}
          </div>
          <div
            className="flex-1 px-3 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: branding.primaryColor }}
          >
            {branding.assistantName || `${branding.brandName || "Marca"} · IA`}
          </div>
        </div>
      </AdminPanel>

      <AdminPanel title="Negócio" subtitle="Contexto da oferta e do segmento">
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="Segmento">
            <AdminInput
              value={business.segment}
              onChange={(e) => setBusiness((b) => ({ ...b, segment: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Ticket médio por conta">
            <AdminInput
              value={business.averageTicket}
              placeholder="R$ 2.500/mês"
              onChange={(e) => setBusiness((b) => ({ ...b, averageTicket: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Público-alvo">
            <AdminInput
              value={business.audience}
              placeholder="PMEs, clínicas, e-commerces…"
              onChange={(e) => setBusiness((b) => ({ ...b, audience: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Descrição curta">
            <AdminInput
              value={business.description}
              onChange={(e) => setBusiness((b) => ({ ...b, description: e.target.value }))}
            />
          </AdminField>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Tracking"
        subtitle="Somente IDs públicos. Access token Meta e API secret GA4 ficam no .env do servidor."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AdminField label="GTM ID">
            <AdminInput
              value={tracking.gtmId}
              placeholder="GTM-XXXXXX"
              onChange={(e) => setTracking((t) => ({ ...t, gtmId: e.target.value }))}
            />
          </AdminField>
          <AdminField label="GA4 Measurement ID">
            <AdminInput
              value={tracking.ga4MeasurementId}
              placeholder="G-XXXXXXX"
              onChange={(e) => setTracking((t) => ({ ...t, ga4MeasurementId: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Google Ads ID">
            <AdminInput
              value={tracking.googleAdsId}
              placeholder="AW-XXXXXXX"
              onChange={(e) => setTracking((t) => ({ ...t, googleAdsId: e.target.value }))}
            />
          </AdminField>
          <AdminField label="Google Ads label">
            <AdminInput
              value={tracking.googleAdsConversionLabel}
              onChange={(e) =>
                setTracking((t) => ({ ...t, googleAdsConversionLabel: e.target.value }))
              }
            />
          </AdminField>
          <AdminField label="Meta Pixel ID">
            <AdminInput
              value={tracking.metaPixelId}
              placeholder="somente números"
              onChange={(e) => setTracking((t) => ({ ...t, metaPixelId: e.target.value }))}
            />
          </AdminField>
        </div>
      </AdminPanel>
    </div>
  );
}
