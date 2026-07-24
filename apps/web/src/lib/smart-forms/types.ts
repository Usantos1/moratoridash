export const SMART_FORM_BLOCK_TYPES = [
  "message",
  "buttons",
  "text",
  "number",
  "phone",
  "email",
  "cpf",
  "cnpj",
  "city",
  "state",
  "date",
  "time",
  "single_choice",
  "multiple_choice",
  "scale",
  "rating",
  "confirmation",
  "lgpd",
  "redirect",
] as const;

export type SmartFormBlockType = (typeof SMART_FORM_BLOCK_TYPES)[number];
export type SmartFormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type Temperature = "COLD" | "WARM" | "HOT" | "VERY_HOT";

export type SmartFormOption = {
  id: string;
  label: string;
  value: string;
  scoreDelta?: number;
  tags?: string[];
  nextNodeId?: string;
};

export type SmartFormEdge = {
  id: string;
  from: string;
  to: string;
  condition?: {
    op: string;
    field?: string;
    value?: string | number | boolean | string[];
  };
  label?: string;
};

export type SmartFormNode = {
  id: string;
  type: SmartFormBlockType | string;
  internalName?: string;
  title?: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  scoreDelta?: number;
  tags?: string[];
  options?: SmartFormOption[];
  redirectUrl?: string;
  redirectDelayMs?: number;
  bannerText?: string;
  notifyTeam?: boolean;
  trackPaidConversion?: boolean;
  mapTo?: string;
  mediaUrl?: string;
  mediaType?: "image" | "audio" | "pdf";
  mediaName?: string;
};

export type SmartFormDefinition = {
  schemaVersion: 1;
  startNodeId: string;
  nodes: SmartFormNode[];
  edges: SmartFormEdge[];
};

export type FormSettings = {
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    backgroundColorDark?: string;
    pageBackgroundColor?: string;
    pageBackgroundColorDark?: string;
    logoUrl?: string;
    faviconUrl?: string;
    fontFamily?: string;
    darkMode?: boolean;
    headerSubtitle?: string;
    completionBannerText?: string;
    chatWallpaperUrl?: string;
    chatWallpaperUrlDark?: string;
    chatWallpaperPattern?: boolean;
  };
  seo?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  tracking?: {
    facebookPixelId?: string;
    metaCapiAccessToken?: string;
    metaCapiTestEventCode?: string;
    gtmContainerId?: string;
    gaMeasurementId?: string;
    googleAdsId?: string;
    googleAdsConversionId?: string;
    googleAdsConversionLabel?: string;
    conversionMinTemperature?: "ALL" | "WARM" | "HOT" | "VERY_HOT";
  };
  webhook?: {
    enabled?: boolean;
    url?: string;
    secret?: string;
  };
  chat?: {
    messageDelayMs?: number;
    returnRedirectUrl?: string;
  };
  leadFields?: {
    customFieldLabels?: Record<string, string>;
  };
};

export type SmartFormRecord = {
  id: string;
  name: string;
  slug: string;
  publicSlug: string;
  status: SmartFormStatus;
  description?: string | null;
  draftDefinition: SmartFormDefinition | Record<string, unknown>;
  settings: FormSettings | Record<string, unknown>;
  scoreColdMax: number;
  scoreWarmMax: number;
  scoreHotMax: number;
  aiSystemPrompt?: string | null;
  aiEnabled: boolean;
  crmSyncEnabled: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  publishedVersion?: { id: string; versionNumber: number; definition: unknown } | null;
  _count?: { leads: number; sessions: number };
};

export function emptyDefinition(): SmartFormDefinition {
  return {
    schemaVersion: 1,
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        title: "Olá!",
        description: "Vamos fazer um diagnóstico rápido para entender melhor o seu perfil.",
      },
      {
        id: "name",
        type: "text",
        title: "Qual é o seu nome?",
        placeholder: "Seu nome completo",
        required: true,
        mapTo: "fullName",
      },
      {
        id: "thanks",
        type: "confirmation",
        title: "Obrigado!",
        description: "Recebemos suas respostas. Em breve entraremos em contato.",
      },
    ],
    edges: [
      { id: "e1", from: "welcome", to: "name" },
      { id: "e2", from: "name", to: "thanks" },
    ],
  };
}

export function coerceDefinition(raw: unknown): SmartFormDefinition {
  if (!raw || typeof raw !== "object") return emptyDefinition();
  const d = raw as Partial<SmartFormDefinition>;
  if (!Array.isArray(d.nodes) || !d.nodes.length) return emptyDefinition();
  return {
    schemaVersion: 1,
    startNodeId: d.startNodeId || d.nodes[0].id,
    nodes: d.nodes,
    edges: Array.isArray(d.edges) ? d.edges : [],
  };
}

export function coerceSettings(raw: unknown): FormSettings {
  return (raw && typeof raw === "object" ? raw : {}) as FormSettings;
}

export function newNodeId(prefix = "n") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export const BLOCK_META: Record<
  string,
  { label: string; category: "display" | "input" | "choice" | "terminal" }
> = {
  message: { label: "Mensagem", category: "display" },
  buttons: { label: "Botões", category: "choice" },
  text: { label: "Texto", category: "input" },
  number: { label: "Número", category: "input" },
  phone: { label: "Telefone", category: "input" },
  email: { label: "E-mail", category: "input" },
  cpf: { label: "CPF", category: "input" },
  cnpj: { label: "CNPJ", category: "input" },
  city: { label: "Cidade", category: "input" },
  state: { label: "Estado", category: "input" },
  date: { label: "Data", category: "input" },
  time: { label: "Hora", category: "input" },
  single_choice: { label: "Escolha única", category: "choice" },
  multiple_choice: { label: "Múltipla escolha", category: "choice" },
  scale: { label: "Escala", category: "choice" },
  rating: { label: "Avaliação", category: "choice" },
  confirmation: { label: "Confirmação", category: "terminal" },
  lgpd: { label: "LGPD", category: "input" },
  redirect: { label: "Redirecionar", category: "terminal" },
};

export const PRIMARY_SWATCHES = [
  "#ee654e",
  "#f97316",
  "#22c55e",
  "#128c7e",
  "#0ea5e9",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];
