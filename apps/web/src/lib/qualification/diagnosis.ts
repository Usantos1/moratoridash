import type { DiagnosisFinding, DiagnosisReport, FormData } from "./types";
import { LOW_REVENUE, firstName, responseLabel, revenueLabel } from "./types";

function parseIntSafe(value: string): number {
  return Number(String(value).replace("+", "")) || 0;
}

export function buildDiagnosisReport(
  form: FormData,
  brandName = "Muratori"
): DiagnosisReport {
  const nome = firstName(form.name);
  const empresa = form.company_name || "agência";
  const atendentes = Math.max(1, parseIntSafe(form.number_of_attendants));
  const leads = parseIntSafe(form.clients_per_day);
  const load = leads / atendentes;
  const isLowRevenue = LOW_REVENUE.includes(form.revenue_level);

  const findings: DiagnosisFinding[] = [];

  if (form.response_time === "dias") {
    findings.push({
      severity: "critical",
      emoji: "🚨",
      title: "Lead do anúncio esfria em dias",
      text: `${nome}, na ${empresa} o lead do Meta/Google espera DIAS. Quando a equipe responde, a concorrência (ou o próprio cliente da conta) já perdeu a venda — e a agência leva a culpa pelo 'tráfego ruim'.`,
    });
  } else if (form.response_time === "horas") {
    findings.push({
      severity: "critical",
      emoji: "🔥",
      title: "CPL alto e lead esfriando",
      text: "Leads pagos esperando horas viram desperdício de mídia. A conta parece cara, mas o gargalo está no atendimento.",
    });
  } else if (form.response_time === "minutos") {
    findings.push({
      severity: "warning",
      emoji: "⏱️",
      title: "Minutos ainda custam conversão",
      text: "Em campanha quente, minutos importam. Sem IA + fila clara, o closer perde timing.",
    });
  } else if (form.response_time === "imediato") {
    findings.push({
      severity: "watch",
      emoji: "⚡",
      title: "Velocidade boa — falta escala e governança",
      text: "Responder rápido sem CRM/IA escala mal: depende de gente online 24h e mistura leads de várias contas.",
    });
  }

  if (load > 20) {
    findings.push({
      severity: "critical",
      emoji: "💥",
      title: "Time no limite",
      text: `~${load.toFixed(1)} leads/dia por pessoa… atendimento vira apagar incêndio e o follow-up some.`,
    });
  } else if (load > 10) {
    findings.push({
      severity: "warning",
      emoji: "⚠️",
      title: "Carga começando a doer",
      text: "Com várias contas ativas, a carga por pessoa já compromete SLA e qualidade.",
    });
  }

  if (leads >= 20) {
    const slow = ["horas", "dias"].includes(form.response_time);
    findings.push({
      severity: slow ? "critical" : "warning",
      emoji: "💸",
      title: "Volume de mídia sem aproveitamento",
      text: "Tem volume de lead, mas sem processo o investimento em anúncio vaza.",
    });
  }

  if (form.niches.length > 3) {
    findings.push({
      severity: "warning",
      emoji: "🧩",
      title: "Muitos segmentos, pouco padrão",
      text: "Atender vários nichos sem kanban/tags por conta gera confusão, lead perdido e CS sobrecarregado.",
    });
  }

  if (findings.length === 0) {
    findings.push({
      severity: "watch",
      emoji: "🔎",
      title: "Espaço claro pra profissionalizar a operação",
      text: "A base está ok; dá pra estruturar atendimento + CRM e vender mais com o mesmo time.",
    });
  }

  const hasCritical = findings.some((f) => f.severity === "critical");
  const hasWarning = findings.some((f) => f.severity === "warning");
  const score = hasCritical ? "critical" : hasWarning ? "warning" : "watch";

  const scoreLabel =
    score === "critical"
      ? "🔴 Risco de queimar mídia e perder cliente"
      : score === "warning"
        ? "🟠 Gargalo na operação da agência"
        : "🟢 Pronta pra escalar contas";

  const headline =
    score === "critical"
      ? `${nome}, a ${empresa} está deixando lead (e cliente) escapar agora.`
      : score === "warning"
        ? `${nome}, a ${empresa} já tem gargalo — e isso custa CPL e retenção.`
        : `${nome}, a ${empresa} pode atender mais contas com o mesmo time.`;

  const responseTone =
    form.response_time === "horas" || form.response_time === "dias"
      ? "critical"
      : form.response_time === "minutos"
        ? "warning"
        : "watch";

  const pains: string[] = [];
  if (["horas", "dias"].includes(form.response_time)) {
    pains.push("Lead quente esfria antes do primeiro contato humano.");
  }
  if (load > 10) {
    pains.push("Time comercial sobrecarregado — follow-up e SLA sofrem.");
  }
  if (leads >= 20) {
    pains.push("Investimento em mídia sem processo claro de aproveitamento.");
  }
  pains.push(
    "Sem histórico, distribuição e follow-up automático por conta, o lead esfria, o cliente da agência reclama do tráfego e ninguém sabe onde a conversão travou."
  );

  const benefits = [
    "IA respondendo leads de anúncio em segundos, 24h, sem perder timing.",
    "WhatsApp + CRM Kanban no mesmo fluxo — por conta, etapa e responsável.",
    "Follow-up, filas e distribuição automática entre CS/closers.",
    `Visibilidade pra gestão: volume, resposta e gargalo por conta/nicho.`,
  ];

  const pitch = isLowRevenue
    ? `Para o momento da ${empresa}, o caminho certo é o Plano Essencial: organizar atendimento com IA + CRM sem complexidade demais.`
    : `O próximo passo é estruturar atendimento com IA + CRM pra proteger cada lead de mídia e profissionalizar a operação da agência.`;

  return {
    score,
    scoreLabel,
    headline,
    metrics: [
      { emoji: "👤", label: "Responsável", value: form.name, tone: "neutral" },
      { emoji: "🏢", label: "Agência", value: empresa, tone: "neutral" },
      {
        emoji: "👥",
        label: "Time comercial",
        value: String(atendentes),
        tone: load > 20 ? "critical" : load > 10 ? "warning" : "watch",
      },
      {
        emoji: "📥",
        label: "Leads/dia",
        value: String(leads),
        tone: leads >= 50 ? "warning" : "neutral",
      },
      {
        emoji:
          form.response_time === "imediato"
            ? "⚡"
            : form.response_time === "minutos"
              ? "⏱️"
              : "🐢",
        label: "Tempo de resposta",
        value: responseLabel(form.response_time),
        tone: responseTone,
      },
      {
        emoji: "💵",
        label: "Faturamento da agência",
        value: revenueLabel(form.revenue_level),
        tone: "neutral",
      },
    ],
    findings,
    pains,
    benefits: benefits.map((b) => b.replace("[MARCA]", brandName)),
    pitch,
    isLowRevenue,
  };
}
