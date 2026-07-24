export type ChatStep =
  | "name"
  | "email"
  | "phone"
  | "company"
  | "attendants"
  | "niches"
  | "clients"
  | "revenue"
  | "response"
  | "result"
  | "offer_ask"
  | "offer_detail"
  | "offer_done";

export type FormData = {
  name: string;
  email: string;
  phone: string;
  company_name: string;
  number_of_attendants: string;
  niches: string[];
  clients_per_day: string;
  revenue_level: string;
  response_time: string;
  additional_info: string;
};

export type MessageRole = "bot" | "lead" | "report";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  text?: string;
  report?: DiagnosisReport;
};

export type FindingSeverity = "critical" | "warning" | "watch" | "neutral";

export type DiagnosisFinding = {
  severity: FindingSeverity;
  emoji: string;
  title: string;
  text: string;
};

export type DiagnosisMetric = {
  emoji: string;
  label: string;
  value: string;
  tone: FindingSeverity;
};

export type DiagnosisReport = {
  score: FindingSeverity;
  scoreLabel: string;
  headline: string;
  metrics: DiagnosisMetric[];
  findings: DiagnosisFinding[];
  pains: string[];
  benefits: string[];
  pitch: string;
  isLowRevenue: boolean;
};

export type PageConfig = {
  id?: string;
  brandName: string;
  assistantName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  checkoutUrl: string;
  whatsappNumber: string | null;
  whatsappMessageTemplate: string | null;
  segmentPreset: string;
  gtmId?: string | null;
  ga4MeasurementId?: string | null;
  metaPixelId?: string | null;
  googleAdsId?: string | null;
  offer: {
    name: string;
    priceLabel: string;
    features: string[];
    note?: string;
    checkoutUrl?: string;
  } | null;
};

export const STEPS: ChatStep[] = [
  "name",
  "email",
  "phone",
  "company",
  "attendants",
  "niches",
  "clients",
  "revenue",
  "response",
  "result",
];

export const NICHES = [
  "Clínicas e Saúde",
  "Odontologia",
  "Estética e Beleza",
  "Imobiliárias",
  "Advocacia",
  "Educação e Cursos",
  "E-commerce",
  "Infoprodutos",
  "Restaurantes e Delivery",
  "Academias",
  "Pet Shop",
  "Automotivo",
  "Construtoras e Arquitetura",
  "Financeiro e Contábil",
  "Seguros",
  "Turismo e Hotéis",
  "Moda e Confecção",
  "Varejo",
  "B2B e Serviços",
  "Tecnologia e SaaS",
  "Indústria",
  "Eventos",
  "Outro",
] as const;

export const ATTENDANT_OPTIONS = [
  "1", "2", "3", "4", "5", "6", "7", "8", "10", "12", "15", "20", "25", "30", "40", "50+",
];

export const CLIENTS_OPTIONS = [
  "5", "10", "20", "30", "50", "80", "100", "150", "200", "300", "500+",
];

export const REVENUE_OPTIONS = [
  { value: "de_10_25", label: "R$ 10.000 - R$ 25.000/mês", emoji: "🌱" },
  { value: "de_25_50", label: "R$ 25.000 - R$ 50.000/mês", emoji: "🌱" },
  { value: "de_50_100", label: "R$ 50.000 - R$ 100.000/mês", emoji: "📈" },
  { value: "de_100_250", label: "R$ 100.000 - R$ 250.000/mês", emoji: "📈" },
  { value: "de_250_500", label: "R$ 250.000 - R$ 500.000/mês", emoji: "🚀" },
  { value: "de_500_1m", label: "R$ 500.000 - R$ 1.000.000/mês", emoji: "🚀" },
  { value: "acima_1m", label: "Acima de R$ 1.000.000/mês", emoji: "🚀" },
] as const;

export const RESPONSE_OPTIONS = [
  { value: "imediato", label: "Imediato (até 1 minuto)", emoji: "⚡" },
  { value: "minutos", label: "Alguns minutos (até 15 min)", emoji: "⏱️" },
  { value: "horas", label: "Horas (até 4 horas)", emoji: "⏳" },
  { value: "dias", label: "Dias (mais de 1 dia)", emoji: "🐢" },
] as const;

export const LOW_REVENUE = ["de_10_25", "baixo", "ate_25k"];

export const DRAFT_KEY = "muratori_qualification_agency_draft_v1";
export const DRAFT_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export const emptyForm = (): FormData => ({
  name: "",
  email: "",
  phone: "",
  company_name: "",
  number_of_attendants: "",
  niches: [],
  clients_per_day: "",
  revenue_level: "",
  response_time: "",
  additional_info: "",
});

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "aí";
}

export function revenueLabel(value: string): string {
  return REVENUE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function responseLabel(value: string): string {
  return RESPONSE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function botQuestion(step: ChatStep, form: FormData, brand: string): string {
  const n = firstName(form.name);
  switch (step) {
    case "name":
      return `Oi! Eu sou a IA do ${brand} 👋 Vou fazer um diagnóstico rápido da operação da sua agência.\n\nComo posso te chamar?`;
    case "email":
      return `Prazer, ${n}! Qual o melhor e-mail pra eu te enviar o resultado?`;
    case "phone":
      return "Beleza! Qual seu WhatsApp com DDD? Uso só pra te enviar o resultado do diagnóstico 🙂";
    case "company":
      return `Beleza, ${n}. Qual o nome da sua agência?`;
    case "attendants":
      return `${n}, quantas pessoas cuidam de atendimento e comercial hoje? (CS, closer, SDR, social…)`;
    case "niches":
      return "Quais nichos a agência atende hoje? Pode marcar mais de um.";
    case "clients":
      return "Quantos leads novos vocês atendem por dia no WhatsApp, aproximadamente? (próprios + dos clientes)";
    case "revenue":
      return `${n}, qual a faixa de faturamento mensal da agência?`;
    case "response":
      return "Última pergunta: quanto tempo a equipe leva pra responder um lead novo que chega do anúncio ou do site?";
    case "result":
      return `${n}, analisei a operação da agência. Olha o que encontrei:`;
    default:
      return "";
  }
}
