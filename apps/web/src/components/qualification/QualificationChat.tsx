import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ATTENDANT_OPTIONS,
  CLIENTS_OPTIONS,
  NICHES,
  REVENUE_OPTIONS,
  RESPONSE_OPTIONS,
  emptyForm,
  firstName,
  responseLabel,
  revenueLabel,
  type ChatMessage,
  type ChatStep,
  type FormData,
  type PageConfig,
} from "../../lib/qualification/types";
import { buildDiagnosisReport } from "../../lib/qualification/diagnosis";
import {
  captureAttribution,
  clearDraft,
  loadDraft,
  saveDraft,
} from "../../lib/qualification/draft";
import {
  autosaveLead,
  checkCompleted,
  completeLead,
  getBrandSettings,
  getPageConfig,
  getPublishedFlow,
  getWhatsappConfig,
  trackWhatsapp,
} from "../../lib/qualification/api";
import {
  choiceOptionsForStep,
  getNextQuestionStep,
  getQuestionSteps,
  normalizeFlowDefinition,
  progressPercent,
  renderStepBotText,
  resolveAssistantLabel,
  shouldShowOfferFromFlow,
  type FlowDefinition,
} from "../../lib/qualification/flow-runtime";
import {
  formatPhoneMask,
  validateCompany,
  validateEmail,
  validateName,
  validateNumberField,
  validatePhone,
} from "../../lib/qualification/validation";
import { DiagnosisCard } from "./DiagnosisCard";
import { installTrackingTags, trackDiagnosticEvent } from "../../lib/tracking";

type Props = {
  mode?: "page" | "modal";
  onClose?: () => void;
  brandOverride?: Partial<PageConfig>;
};

const DEFAULT_CONFIG: PageConfig = {
  brandName: "Muratori",
  assistantName: "Muratori · IA",
  primaryColor: "#075e54",
  secondaryColor: "#128c7e",
  logoUrl: null,
  checkoutUrl: "https://pay.hotmart.com/ADAPTAR",
  whatsappNumber: null,
  whatsappMessageTemplate: null,
  segmentPreset: "agencia_marketing",
  offer: {
    name: "Plano Essencial",
    priceLabel: "R$ 199,90/mês",
    features: [
      "1 WhatsApp conectado + até 6 atendentes",
      "Chatbot e Agentes de IA (ChatGPT)",
      "CRM Kanban + histórico por lead/conta",
      "Follow-up e agendamento",
      "Mensagens ilimitadas",
      "Portal de membros",
      "Suporte e-mail/WhatsApp",
    ],
    note: "Implementação assistida opcional: R$ 1.000 — só se não quiser seguir as aulas do portal.",
  },
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const DEFAULT_WA_TEMPLATE = `Olá, sou *{nome}*! Fiz o diagnóstico da minha agência e quero testar como o CRM + IA podem organizar o atendimento dos leads de mídia.

📋 *Resumo do Diagnóstico (Agência):*
• Nome: {nome}
• Agência: {empresa}
• Time comercial/atendimento: {atendentes}
• Leads/dia no WhatsApp: {clientes_dia}
• Faturamento da agência: {faturamento}
• Tempo de resposta ao lead: {tempo_resposta}
• Nichos que atende: {nichos}
• Página onde preencheu: {origem}`;

const startedRef = { current: false };

export function QualificationChat({ mode = "page", onClose, brandOverride }: Props) {
  const [config, setConfig] = useState<PageConfig>({ ...DEFAULT_CONFIG, ...brandOverride });
  const [flow, setFlow] = useState<FlowDefinition | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [step, setStep] = useState<ChatStep>("name");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pendingNiches, setPendingNiches] = useState<string[]>([]);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [botBusy, setBotBusy] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState<{
    name: string;
    companyName?: string;
    completedAt?: string;
  } | null>(null);
  const [pauseAutoScroll, setPauseAutoScroll] = useState(false);
  const [skipSaveOnClose, setSkipSaveOnClose] = useState(false);

  const msgCounter = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reportTopRef = useRef<HTMLDivElement>(null);
  const reportEndRef = useRef<HTMLDivElement>(null);
  const attribution = useRef(captureAttribution());
  const formRef = useRef(form);
  const stepRef = useRef(step);
  const messagesRef = useRef(messages);
  const nichesRef = useRef(pendingNiches);
  const leadIdRef = useRef(leadId);
  const flowRef = useRef<FlowDefinition | null>(null);
  const configRef = useRef(config);

  formRef.current = form;
  stepRef.current = step;
  messagesRef.current = messages;
  nichesRef.current = pendingNiches;
  leadIdRef.current = leadId;
  flowRef.current = flow;
  configRef.current = config;

  const showChoices = !typing && !botBusy && !checkingDuplicate;
  const questionSteps = useMemo(() => getQuestionSteps(flow), [flow]);
  const progress = useMemo(() => progressPercent(flow, step), [flow, step]);
  const nicheOptions = useMemo(
    () => choiceOptionsForStep(flow, "niches").niches || [...NICHES],
    [flow]
  );
  const attendantChips = useMemo(
    () => choiceOptionsForStep(flow, "attendants").chips || [...ATTENDANT_OPTIONS],
    [flow]
  );
  const clientChips = useMemo(
    () => choiceOptionsForStep(flow, "clients").chips || [...CLIENTS_OPTIONS],
    [flow]
  );
  const revenueCards = useMemo(
    () => choiceOptionsForStep(flow, "revenue").cards || REVENUE_OPTIONS.map((o) => ({ ...o })),
    [flow]
  );
  const responseCards = useMemo(
    () => choiceOptionsForStep(flow, "response").cards || RESPONSE_OPTIONS.map((o) => ({ ...o })),
    [flow]
  );

  const statusText = checkingDuplicate
    ? "verificando..."
    : typing
      ? "digitando..."
      : botBusy
        ? "analisando..."
        : "diagnóstico online";

  function nextId() {
    msgCounter.current += 1;
    return `m-${msgCounter.current}`;
  }

  function persistDraft() {
    if (skipSaveOnClose || alreadyDone) return;
    if (typing || botBusy) return;
    if (messagesRef.current.length === 0) return;
    saveDraft({
      formData: formRef.current,
      chatStep: stepRef.current,
      messages: messagesRef.current,
      currentLeadId: leadIdRef.current,
      pendingNiches: nichesRef.current,
      messageIdCounter: msgCounter.current,
      updatedAt: Date.now(),
      attribution: attribution.current,
    });
  }

  async function sayBot(text: string, typingMs?: number) {
    setTyping(true);
    const ms = typingMs ?? clamp(text.length * 42, 1800, 3200);
    await sleep(ms);
    setTyping(false);
    setMessages((prev) => [...prev, { id: nextId(), role: "bot", text }]);
    await sleep(650);
  }

  async function askStep(next: ChatStep, formData: FormData) {
    setStep(next);
    setTyping(true);
    const ms = next === "name" ? 900 : 1400;
    await sleep(ms);
    setTyping(false);
    const brand = configRef.current.brandName;
    const text = renderStepBotText(flowRef.current, next, formData, brand);
    setMessages((prev) => [...prev, { id: nextId(), role: "bot", text }]);
    if (["name", "email", "phone", "company", "attendants", "clients"].includes(next)) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  async function maybeAutosave(nextForm: FormData, id = leadId) {
    if (!nextForm.email || !nextForm.phone) return id;
    if (!id && !nextForm.company_name) return id;
    try {
      const res = await autosaveLead({
        id: id ?? undefined,
        form: nextForm,
        attribution: attribution.current,
        pageConfigId: config.id,
      });
      setLeadId(res.id);
      return res.id;
    } catch (e) {
      const err = e as Error & { message?: string };
      if (/email|check/i.test(err.message || "")) {
        toast.error("E-mail inválido no servidor. Confira o e-mail.");
        setStep("email");
      } else if (/revenue_level/i.test(err.message || "")) {
        toast.error("Faixa de faturamento não liberada no servidor.");
      }
      return id;
    }
  }

  async function runResultSequence(nextForm: FormData, currentLeadId: string | null) {
    setBotBusy(true);
    setPauseAutoScroll(true);
    const report = buildDiagnosisReport(nextForm, config.brandName);
    const n = firstName(nextForm.name);
    const empresa = nextForm.company_name;

    const id = await maybeAutosave(nextForm, currentLeadId);
    await sayBot(
      `${n}, pronto. Montei o diagnóstico da ${empresa} com base nas suas respostas 👇`,
      2200
    );

    setMessages((prev) => [
      ...prev,
      {
        id: nextId(),
        role: "bot",
        text: renderStepBotText(flowRef.current, "result", nextForm, config.brandName),
      },
      { id: nextId(), role: "report", report },
    ]);
    trackDiagnosticEvent("diagnostic_report_viewed", {
      score: report.score,
      is_low_revenue: report.isLowRevenue,
    });

    setTimeout(() => {
      reportTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

    // Pausa de leitura: 10s ou scroll até o fim / card cabe na tela
    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cleanup();
        resolve();
      };
      const onScroll = () => {
        const end = reportEndRef.current;
        const box = scrollRef.current;
        if (!end || !box) return;
        const er = end.getBoundingClientRect();
        const br = box.getBoundingClientRect();
        if (er.top <= br.bottom - 8) finish();
      };
      const timer = window.setTimeout(finish, 10000);
      const early = window.setTimeout(() => {
        const end = reportEndRef.current;
        const box = scrollRef.current;
        if (!end || !box) return;
        if (end.getBoundingClientRect().bottom <= box.getBoundingClientRect().bottom + 4) {
          window.setTimeout(finish, 1200);
        }
      }, 400);
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) finish();
        },
        { root: scrollRef.current, threshold: 0.2 }
      );
      if (reportEndRef.current) observer.observe(reportEndRef.current);
      scrollRef.current?.addEventListener("scroll", onScroll);
      const cleanup = () => {
        clearTimeout(timer);
        clearTimeout(early);
        observer.disconnect();
        scrollRef.current?.removeEventListener("scroll", onScroll);
      };
    });

    setPauseAutoScroll(false);

    const showOffer = shouldShowOfferFromFlow(flowRef.current, nextForm);
    if (showOffer) {
      if (id) {
        try {
          await completeLead(id, "offer_view");
        } catch (e) {
          const err = e as Error & { status?: number; data?: { name?: string; companyName?: string; completedAt?: string } };
          if (err.status === 409) {
            setAlreadyDone({
              name: err.data?.name || nextForm.name,
              companyName: err.data?.companyName || nextForm.company_name,
              completedAt: err.data?.completedAt,
            });
            clearDraft();
            setSkipSaveOnClose(true);
            setBotBusy(false);
            return;
          }
        }
      }
      setStep("offer_ask");
      await sayBot(
        `${n}, quer ver o valor do Plano Essencial e o que entra nele pra organizar o atendimento da agência agora?`
      );
    } else {
      setStep("result");
      await sayBot(
        `${n}, quer que eu te leve pro WhatsApp pra finalizar o cadastro e testar na operação da agência?`
      );
    }
    setBotBusy(false);
  }

  async function advance(answerLabel: string, patch: Partial<FormData>, fromStep: ChatStep) {
    if (typing || botBusy) return;
    const nextForm = { ...form, ...patch };
    setForm(nextForm);
    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "lead", text: answerLabel }]);

    if (fromStep === "name") {
      trackDiagnosticEvent("diagnostic_started", { step: "name" });
    }
    trackDiagnosticEvent("diagnostic_step_completed", {
      step: fromStep,
      step_index: questionSteps.indexOf(fromStep) + 1,
    });

    const next = getNextQuestionStep(flowRef.current, fromStep);

    let id = leadId;
    if (["email", "phone", "company", "attendants", "niches", "clients", "revenue", "response"].includes(fromStep)) {
      id = (await maybeAutosave(nextForm, leadId)) ?? leadId;
    }

    if (fromStep === "company") {
      setCheckingDuplicate(true);
      try {
        const dup = await checkCompleted(nextForm.email, nextForm.phone);
        if (dup.completed) {
          setAlreadyDone({
            name: dup.name || nextForm.name,
            companyName: dup.companyName || nextForm.company_name,
            completedAt: dup.completedAt,
          });
          clearDraft();
          setSkipSaveOnClose(true);
          setCheckingDuplicate(false);
          return;
        }
      } catch {
        // ignore network
      }
      setCheckingDuplicate(false);
    }

    if (!next || fromStep === "response") {
      await runResultSequence(nextForm, id);
      return;
    }

    await askStep(next, nextForm);
  }

  async function handleTextSubmit() {
    if (!showChoices) return;
    const value = input.trim();
    if (step === "name") {
      const err = validateName(value);
      if (err) return toast.error(err);
      return advance(value, { name: value }, "name");
    }
    if (step === "email") {
      const err = validateEmail(value);
      if (err) return toast.error(err);
      return advance(value, { email: value }, "email");
    }
    if (step === "phone") {
      const err = validatePhone(value);
      if (err) return toast.error(err);
      return advance(formatPhoneMask(value), { phone: formatPhoneMask(value) }, "phone");
    }
    if (step === "company") {
      const err = validateCompany(value);
      if (err) return toast.error(err);
      return advance(value, { company_name: value }, "company");
    }
    if (step === "attendants") {
      const err = validateNumberField(value);
      if (err) return toast.error(err);
      return advance(value, { number_of_attendants: value.replace("+", "") }, "attendants");
    }
    if (step === "clients") {
      const err = validateNumberField(value);
      if (err) return toast.error(err);
      return advance(`${value.replace("+", "")}/dia`, { clients_per_day: value.replace("+", "") }, "clients");
    }
  }

  async function handleWhatsappCta() {
    trackDiagnosticEvent("diagnostic_cta_clicked", { cta: "whatsapp" });
    if (!leadId) {
      toast.error("Salvando diagnóstico… tente de novo em instantes.");
      return;
    }
    setBotBusy(true);
    try {
      const dup = await checkCompleted(form.email, form.phone);
      if (dup.completed && dup.leadId !== leadId) {
        setAlreadyDone({
          name: dup.name || form.name,
          companyName: dup.companyName || form.company_name,
          completedAt: dup.completedAt,
        });
        clearDraft();
        setSkipSaveOnClose(true);
        return;
      }
      await completeLead(leadId, "whatsapp");
      const wa = await getWhatsappConfig();
      const number = (config.whatsappNumber || wa.whatsappNumber || "").replace(/\D/g, "");
      const template =
        config.whatsappMessageTemplate || wa.whatsappMessageTemplate || DEFAULT_WA_TEMPLATE;
      const vars: Record<string, string> = {
        nome: form.name || "Não informado",
        empresa: form.company_name || "Não informado",
        email: form.email || "Não informado",
        telefone: form.phone || "Não informado",
        atendentes: form.number_of_attendants || "Não informado",
        clientes_dia: form.clients_per_day || "Não informado",
        faturamento: revenueLabel(form.revenue_level) || "Não informado",
        tempo_resposta: responseLabel(form.response_time) || "Não informado",
        nichos: form.niches.join(", ") || "Não informado",
        origem: window.location.href,
      };
      let message = template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? "Não informado");
      if (!/página onde preencheu|origem/i.test(template)) {
        message += `\n• Página onde preencheu: ${window.location.href}`;
      }
      const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
      void trackWhatsapp(leadId, url);
      const popup = window.open(url, "_blank");
      if (!popup) window.location.href = url;
      toast.success("Diagnóstico salvo! Redirecionando para WhatsApp...");
      clearDraft();
      setSkipSaveOnClose(true);
      setTimeout(() => onClose?.(), 2000);
    } catch (e) {
      const err = e as Error & { status?: number; data?: { name?: string; companyName?: string; completedAt?: string } };
      if (err.status === 409) {
        setAlreadyDone({
          name: err.data?.name || form.name,
          companyName: err.data?.companyName || form.company_name,
          completedAt: err.data?.completedAt,
        });
        clearDraft();
        setSkipSaveOnClose(true);
      } else {
        toast.error("Não foi possível concluir. Tente novamente.");
      }
    } finally {
      setBotBusy(false);
    }
  }

  async function handleOfferYes() {
    trackDiagnosticEvent("diagnostic_cta_clicked", { cta: "offer_yes" });
    setBotBusy(true);
    await sayBot(
      "Perfeito. Montei o resumo do Plano Essencial pra sua agência — valor, o que inclui e como contratar."
    );
    await sayBot("Checkout seguro na Hotmart — você pode cancelar quando quiser.");
    setStep("offer_detail");
    setBotBusy(false);
  }

  async function handleOfferNo() {
    setBotBusy(true);
    await sayBot(
      `Tranquilo, ${firstName(form.name)}. Quando quiser estruturar o atendimento da agência, o Essencial continua sendo o caminho certo pro seu momento. Estou por aqui 💚`
    );
    clearDraft();
    setSkipSaveOnClose(true);
    setStep("offer_done");
    setBotBusy(false);
  }

  async function handleCheckout() {
    trackDiagnosticEvent("diagnostic_cta_clicked", { cta: "checkout" });
    if (leadId) {
      try {
        await completeLead(leadId, "checkout");
      } catch {
        // não bloqueia
      }
    }
    const url = config.offer?.checkoutUrl || config.checkoutUrl;
    toast.success("Abrindo checkout da Hotmart...");
    window.open(url, "_blank");
    clearDraft();
    setSkipSaveOnClose(true);
    setTimeout(() => onClose?.(), 1200);
  }

  // boot
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    (async () => {
      // Marca global primeiro; a page config sobrescreve o que definir
      const tracking = {
        gtmId: null as string | null,
        ga4MeasurementId: null as string | null,
        metaPixelId: null as string | null,
        googleAdsId: null as string | null,
      };

      try {
        const brand = await getBrandSettings();
        setConfig((c) => ({ ...c, ...brand, ...brandOverride }));
        Object.assign(tracking, {
          gtmId: brand.gtmId,
          ga4MeasurementId: brand.ga4MeasurementId,
          metaPixelId: brand.metaPixelId,
          googleAdsId: brand.googleAdsId,
        });
      } catch {
        // mantém defaults
      }

      try {
        const page = await getPageConfig("diagnostico");
        const merged = Object.fromEntries(
          Object.entries(page).filter(([, v]) => v !== null && v !== undefined)
        ) as Partial<PageConfig>;
        setConfig((c) => ({ ...c, ...merged, ...brandOverride }));
        Object.assign(tracking, {
          gtmId: page.gtmId ?? tracking.gtmId,
          ga4MeasurementId: page.ga4MeasurementId ?? tracking.ga4MeasurementId,
          metaPixelId: page.metaPixelId ?? tracking.metaPixelId,
          googleAdsId: page.googleAdsId ?? tracking.googleAdsId,
        });
      } catch {
        // keep defaults
      }

      installTrackingTags(tracking);
      trackDiagnosticEvent("diagnostic_page_view", { mode });

      try {
        const published = await getPublishedFlow();
        const def = normalizeFlowDefinition(published.definition);
        setFlow(def);
        flowRef.current = def;
        setConfig((c) => ({
          ...c,
          assistantName: resolveAssistantLabel(def, c.brandName, c.assistantName),
          ...brandOverride,
        }));
      } catch {
        // fallback: STEPS hardcoded + botQuestion
      }

      const draft = loadDraft();
      if (draft) {
        setForm(draft.formData);
        setStep(draft.chatStep);
        setMessages(draft.messages);
        setLeadId(draft.currentLeadId);
        setPendingNiches(draft.pendingNiches);
        msgCounter.current = draft.messageIdCounter;
        if (draft.attribution) attribution.current = { ...attribution.current, ...draft.attribution };

        if (draft.formData.email && draft.formData.phone) {
          setCheckingDuplicate(true);
          try {
            const dup = await checkCompleted(draft.formData.email, draft.formData.phone);
            if (dup.completed) {
              clearDraft();
              setSkipSaveOnClose(true);
              setAlreadyDone({
                name: dup.name || draft.formData.name,
                companyName: dup.companyName || draft.formData.company_name,
                completedAt: dup.completedAt,
              });
              setCheckingDuplicate(false);
              return;
            }
          } catch {
            // ignore
          }
          setCheckingDuplicate(false);
        }

        setTimeout(async () => {
          const welcome = `Oi de novo, ${firstName(draft.formData.name)}! Continuamos o diagnóstico da agência de onde paramos 😊`;
          const last = draft.messages[draft.messages.length - 1];
          if (last?.text !== welcome) {
            setMessages((prev) => [...prev, { id: `m-${++msgCounter.current}`, role: "bot", text: welcome }]);
          }
        }, 400);
        return;
      }

      await askStep("name", emptyForm());
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pauseAutoScroll) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, pauseAutoScroll]);

  useEffect(() => {
    persistDraft();
  }, [form, step, messages, pendingNiches, leadId, typing, botBusy]);

  useEffect(() => {
    return () => {
      if (!skipSaveOnClose) persistDraft();
    };
  }, [skipSaveOnClose]);

  if (alreadyDone) {
    const when = alreadyDone.completedAt
      ? new Date(alreadyDone.completedAt).toLocaleString("pt-BR")
      : "recentemente";
    return (
      <div className="flex h-full min-h-[480px] items-center justify-center bg-[#efeae2] p-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl text-emerald-700">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {alreadyDone.name}, já recebemos os dados da sua agência!
          </h2>
          <p className="mt-2 text-sm text-slate-600">Conclusão registrada em {when}.</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              className="rounded-full px-4 py-3 font-semibold text-white"
              style={{ backgroundColor: config.primaryColor }}
              onClick={() => {
                const text = `Olá! Sou ${alreadyDone.name}, da agência ${alreadyDone.companyName || ""}. Já fiz o diagnóstico no site e quero continuar a conversa.`;
                window.open(
                  `https://wa.me/${(config.whatsappNumber || "5511999999999").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
                  "_blank"
                );
              }}
            >
              Falar no WhatsApp
            </button>
            {onClose && (
              <button type="button" className="rounded-full px-4 py-3 text-slate-600" onClick={onClose}>
                Fechar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const textSteps: ChatStep[] = ["name", "email", "phone", "company", "attendants", "clients"];
  const showInput = showChoices && textSteps.includes(step);

  return (
    <div
      className={`flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#efeae2] ${
        mode === "modal" ? "" : ""
      }`}
    >
      <header
        className="flex items-center gap-3 px-4 py-3 text-white"
        style={{ backgroundColor: config.primaryColor }}
      >
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-300 bg-white text-sm font-bold text-emerald-800">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (config.brandName[0] || "M").toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{config.assistantName}</div>
          <div className="text-xs text-emerald-100">{statusText}</div>
        </div>
        <div className="hidden text-right text-xs sm:block">
          <div className="font-semibold">{progress}%</div>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-emerald-900/40">
            <div className="h-full bg-emerald-200 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
        {messages.map((m) => {
          if (m.role === "report" && m.report) {
            return (
              <div key={m.id} ref={reportTopRef}>
                <DiagnosisCard report={m.report} brandName={config.brandName} />
                <div ref={reportEndRef} className="h-1" />
              </div>
            );
          }
          const isLead = m.role === "lead";
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isLead ? "justify-end" : "justify-start"}`}>
              {!isLead && (
                <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-800">
                  IA
                </div>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  isLead
                    ? "rounded-br-md bg-[#d9fdd3] text-slate-900"
                    : "rounded-bl-md bg-white text-slate-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-end gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-emerald-800">
              IA
            </div>
            <div className="flex gap-1 rounded-2xl rounded-bl-md bg-white px-3 py-3 shadow-sm">
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.2s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.1s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
            </div>
          </div>
        )}

        {showChoices && step === "niches" && (
          <div className="space-y-3 rounded-2xl bg-white/70 p-3">
            <div className="flex flex-wrap gap-2">
              {nicheOptions.map((n) => {
                const on = pendingNiches.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() =>
                      setPendingNiches((prev) =>
                        on ? prev.filter((x) => x !== n) : [...prev, n]
                      )
                    }
                    className={`rounded-full border-2 px-3 py-1.5 text-sm font-bold transition ${
                      on
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              disabled={pendingNiches.length < 1}
              onClick={() =>
                advance(pendingNiches.join(", "), { niches: pendingNiches }, "niches")
              }
              className="w-full rounded-full bg-orange-500 px-4 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar ({pendingNiches.length})
            </button>
          </div>
        )}

        {showChoices && step === "attendants" && (
          <div className="flex flex-wrap gap-2">
            {attendantChips.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => advance(o, { number_of_attendants: o.replace("+", "") }, "attendants")}
                className="rounded-full border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white"
              >
                {o}
              </button>
            ))}
          </div>
        )}

        {showChoices && step === "clients" && (
          <div className="flex flex-wrap gap-2">
            {clientChips.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() =>
                  advance(`${o.replace("+", "")}/dia`, { clients_per_day: o.replace("+", "") }, "clients")
                }
                className="rounded-full border-2 border-emerald-500 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white"
              >
                {o}/dia
              </button>
            ))}
          </div>
        )}

        {showChoices && step === "revenue" && (
          <div className="space-y-2">
            {revenueCards.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => advance(o.label, { revenue_level: o.value }, "revenue")}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-left font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">
                  {o.emoji || "•"}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        )}

        {showChoices && step === "response" && (
          <div className="space-y-2">
            {responseCards.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => advance(o.label, { response_time: o.value }, "response")}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-left font-bold text-emerald-800 hover:bg-emerald-600 hover:text-white"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg">
                  {o.emoji || "•"}
                </span>
                {o.label}
              </button>
            ))}
          </div>
        )}

        {showChoices && step === "result" && !shouldShowOfferFromFlow(flow, form) && (
          <button
            type="button"
            onClick={handleWhatsappCta}
            className="w-full rounded-full bg-[#25d366] px-4 py-3 font-bold text-white shadow"
          >
            {firstName(form.name)}, concluir no WhatsApp
          </button>
        )}

        {showChoices && step === "offer_ask" && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleOfferYes}
              className="rounded-full bg-orange-500 px-4 py-3 font-bold text-white"
            >
              Sim, quero conhecer o plano
            </button>
            <button
              type="button"
              onClick={handleOfferNo}
              className="rounded-full border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700"
            >
              Agora não
            </button>
          </div>
        )}

        {showChoices && step === "offer_detail" && config.offer && (
          <div className="rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow">
            <div className="mb-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              PLANO INDICADO PRA SUA AGÊNCIA
            </div>
            <h3 className="text-lg font-bold text-slate-900">{config.offer.name}</h3>
            <p className="mt-1 text-2xl font-extrabold text-emerald-700">{config.offer.priceLabel}</p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {config.offer.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {config.offer.note && (
              <p className="mt-3 text-xs text-slate-500">{config.offer.note}</p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              className="mt-4 w-full rounded-full bg-orange-500 px-4 py-3 font-bold text-white"
            >
              Quero contratar agora
            </button>
          </div>
        )}
      </div>

      {showInput && (
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2">
          {onClose && (
            <button
              type="button"
              onClick={() => {
                persistDraft();
                onClose();
              }}
              className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600"
            >
              Voltar
            </button>
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) =>
              setInput(step === "phone" ? formatPhoneMask(e.target.value) : e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleTextSubmit();
            }}
            inputMode={step === "phone" || step === "attendants" || step === "clients" ? "numeric" : "text"}
            maxLength={step === "phone" ? 15 : 120}
            placeholder={
              step === "phone"
                ? "(19) 99999-9999"
                : step === "email"
                  ? "nome@agencia.com"
                  : "Digite sua resposta..."
            }
            className="flex-1 rounded-full border-0 bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => void handleTextSubmit()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: config.primaryColor }}
            aria-label="Enviar"
          >
            ➤
          </button>
        </div>
      )}
    </div>
  );
}
