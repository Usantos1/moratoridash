import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Copy,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Thermometer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { smartFormsApi } from "../../lib/smart-forms-api";
import { AdminBadge, AdminButton } from "./ui";

type Props = {
  leadId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
  onLoaded?: (info: { formId: string }) => void;
  canDelete?: boolean;
};

function tempTone(t: string): "neutral" | "warn" | "live" | "danger" {
  if (t === "COLD") return "neutral";
  if (t === "WARM") return "warn";
  if (t === "HOT" || t === "VERY_HOT") return "live";
  return "neutral";
}

function tempLabel(t: string) {
  return (
    ({
      COLD: "Frio",
      WARM: "Morno",
      HOT: "Quente",
      VERY_HOT: "Muito quente",
    } as Record<string, string>)[t] || t
  );
}

function statusLabel(s: string) {
  return (
    ({
      COMPLETED: "Concluído",
      IN_PROGRESS: "Em andamento",
      ABANDONED: "Abandonado",
      DISQUALIFIED: "Desqualificado",
    } as Record<string, string>)[s] || s
  );
}

function formatValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copiado`),
    () => toast.error("Não foi possível copiar")
  );
}

export function SmartLeadModal({ leadId, onClose, onDeleted, onLoaded, canDelete }: Props) {
  const [lead, setLead] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      return;
    }
    setLoading(true);
    void smartFormsApi
      .lead(leadId)
      .then((data) => {
        setLead(data);
        const form = data.form as { id?: string } | undefined;
        const resolvedFormId = form?.id || (data.formId as string) || "";
        if (resolvedFormId) onLoaded?.({ formId: resolvedFormId });
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Erro ao carregar lead"))
      .finally(() => setLoading(false));
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [leadId, onClose]);

  if (!leadId) return null;

  const form = lead?.form as { name?: string; publicSlug?: string } | undefined;
  const session = lead?.session as Record<string, unknown> | undefined;
  const events = (lead?.events as Array<Record<string, unknown>>) || [];
  const answerItems =
    (lead?.answerItems as Array<{
      nodeId: string;
      title?: string;
      type?: string | null;
      value: unknown;
    }>) || [];
  const custom = (lead?.customFields || {}) as Record<
    string,
    { label?: string; value?: unknown }
  >;
  const tags = (lead?.tags as string[]) || [];
  const displayName =
    (lead?.fullName as string) ||
    (lead?.email as string) ||
    (lead?.phone as string) ||
    "Lead";

  async function remove() {
    if (!leadId || !confirm("Excluir este lead?")) return;
    try {
      await smartFormsApi.deleteLead(leadId);
      toast.success("Lead excluído");
      onClose();
      onDeleted?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao excluir");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-modal-title"
        className="relative z-10 flex max-h-[min(920px,94dvh)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[#e5e7eb] bg-white shadow-[0_24px_80px_rgba(16,24,40,0.28)] sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#eef0f4] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
              {form?.name || "Formulário"}
            </p>
            <h2
              id="lead-modal-title"
              className="mt-0.5 truncate text-xl font-bold text-[#1d202b]"
            >
              {loading ? "Carregando…" : displayName}
            </h2>
            {lead && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <AdminBadge tone={tempTone(String(lead.temperature))}>
                  {tempLabel(String(lead.temperature))}
                </AdminBadge>
                <AdminBadge tone="warn">{statusLabel(String(lead.status))}</AdminBadge>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ebf3ff] px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">
                  <Thermometer className="h-3 w-3" />
                  Score {String(lead.score ?? 0)}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#6b7280] hover:bg-[#f3f4f6] hover:text-[#1d202b]"
            aria-label="Fechar"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {loading || !lead ? (
            <p className="text-sm text-muted-foreground">Carregando detalhes…</p>
          ) : (
            <div className="space-y-6">
              <section>
                <SectionTitle>Contato</SectionTitle>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <ContactCard
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label="E-mail"
                    value={lead.email as string}
                    copyable
                  />
                  <ContactCard
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label="Telefone"
                    value={lead.phone as string}
                    copyable
                  />
                  <ContactCard
                    icon={<Building2 className="h-3.5 w-3.5" />}
                    label="Empresa"
                    value={lead.companyName as string}
                  />
                  <ContactCard
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    label="Criado em"
                    value={
                      lead.createdAt
                        ? new Date(String(lead.createdAt)).toLocaleString("pt-BR")
                        : null
                    }
                  />
                </div>
                {Object.keys(custom).length > 0 && (
                  <dl className="mt-3 space-y-2 rounded-2xl border border-border/60 bg-[#f8fafc] p-3 text-sm">
                    {Object.entries(custom).map(([k, v]) => (
                      <Row key={k} label={v.label || k} value={formatValue(v.value)} />
                    ))}
                  </dl>
                )}
                {tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <AdminBadge key={tag}>{tag}</AdminBadge>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <SectionTitle>Origem / UTM</SectionTitle>
                <dl className="mt-3 grid gap-2 rounded-2xl border border-border/60 bg-[#f8fafc] p-3 text-sm sm:grid-cols-2">
                  <Row label="UTM Source" value={lead.utmSource} />
                  <Row label="UTM Medium" value={lead.utmMedium} />
                  <Row label="UTM Campaign" value={lead.utmCampaign} />
                  <Row label="UTM Term" value={lead.utmTerm} />
                  <Row label="UTM Content" value={lead.utmContent} />
                  <Row label="gclid" value={lead.gclid} />
                  <Row label="fbclid" value={lead.fbclid} />
                  <Row label="ttclid" value={lead.ttclid} />
                  <Row label="Landing" value={lead.landingPage} wide />
                  <Row label="Referrer" value={lead.referrer} wide />
                </dl>
              </section>

              {(session?.deviceType || session?.browserName || session?.osName) && (
                <section>
                  <SectionTitle>Dispositivo</SectionTitle>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    {[session.deviceType, session.osName, session.browserName]
                      .filter(Boolean)
                      .map((item) => (
                        <span
                          key={String(item)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-[#1d202b]"
                        >
                          <Monitor className="h-3 w-3 text-[#6b7280]" />
                          {String(item)}
                        </span>
                      ))}
                    {(session.geoCity || session.geoCountry) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-white px-3 py-1 text-xs font-medium text-[#1d202b]">
                        <MapPin className="h-3 w-3 text-[#6b7280]" />
                        {[session.geoCity, session.geoState, session.geoCountry]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </section>
              )}

              <section>
                <SectionTitle>Respostas ({answerItems.length})</SectionTitle>
                <div className="mt-3 divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60">
                  {answerItems.length === 0 ? (
                    <p className="px-4 py-5 text-sm text-muted-foreground">Sem respostas.</p>
                  ) : (
                    answerItems.map((a) => (
                      <div key={a.nodeId} className="bg-white px-4 py-3">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
                          {a.title || a.nodeId}
                        </div>
                        <div className="mt-1 text-sm font-medium text-[#1d202b]">
                          {formatValue(a.value)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {(lead.aiSummary as { text?: string } | null)?.text ? (
                <section>
                  <SectionTitle>Resumo IA</SectionTitle>
                  <p className="mt-3 rounded-2xl border border-border/60 bg-[#f8fafc] p-4 text-sm leading-relaxed text-[#374151]">
                    {String((lead.aiSummary as { text?: string }).text)}
                  </p>
                </section>
              ) : null}

              {events.length > 0 && (
                <section>
                  <SectionTitle>Timeline</SectionTitle>
                  <ul className="mt-3 space-y-2">
                    {events.map((ev) => (
                      <li
                        key={String(ev.id)}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-[#f8fafc] px-3 py-2 text-xs"
                      >
                        <span>
                          <strong className="text-[#1d202b]">{String(ev.eventName)}</strong>
                          <span className="text-[#6b7280]"> · {String(ev.eventType)}</span>
                        </span>
                        <span className="tabular-nums text-[#9aa1ad]">
                          {ev.createdAt
                            ? new Date(String(ev.createdAt)).toLocaleString("pt-BR")
                            : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#eef0f4] px-5 py-3">
          {canDelete ? (
            <AdminButton variant="danger" className="!px-3 !py-2 text-xs" onClick={() => void remove()}>
              Excluir lead
            </AdminButton>
          ) : (
            <span />
          )}
          <AdminButton variant="ghost" className="!px-3 !py-2 text-xs" onClick={onClose}>
            Fechar
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
      {children}
    </h3>
  );
}

function Row({
  label,
  value,
  wide,
}: {
  label: string;
  value: unknown;
  wide?: boolean;
}) {
  return (
    <div className={`flex justify-between gap-3 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="shrink-0 text-[#6b7280]">{label}</dt>
      <dd className="break-all text-right font-medium text-[#1d202b]">
        {formatValue(value)}
      </dd>
    </div>
  );
}

function ContactCard({
  icon,
  label,
  value,
  copyable,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  copyable?: boolean;
}) {
  const empty = !value;
  return (
    <div className="rounded-2xl border border-border/60 bg-[#f8fafc] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7280]">
        {icon}
        {label}
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <span className={`truncate text-sm font-medium ${empty ? "text-[#9aa1ad]" : "text-[#1d202b]"}`}>
          {empty ? "—" : value}
        </span>
        {copyable && value ? (
          <button
            type="button"
            className="rounded-lg p-1 text-[#6b7280] hover:bg-white hover:text-[#1d202b]"
            aria-label={`Copiar ${label}`}
            onClick={() => copyText(label, value)}
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
