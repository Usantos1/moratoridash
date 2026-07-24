import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(__filename);
const { AGENCY_FLOW_V1 } = require("../presets/agency-flow-v1") as {
  AGENCY_FLOW_V1: object;
};

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const DEFAULT_WHATSAPP_TEMPLATE = `Olá, sou *{nome}*! Fiz o diagnóstico da minha agência e quero testar como o CRM + IA podem organizar o atendimento dos leads de mídia.

📋 *Resumo do Diagnóstico (Agência):*
• Nome: {nome}
• Agência: {empresa}
• Time comercial/atendimento: {atendentes}
• Leads/dia no WhatsApp: {clientes_dia}
• Faturamento da agência: {faturamento}
• Tempo de resposta ao lead: {tempo_resposta}
• Nichos que atende: {nichos}
• Página onde preencheu: {origem}`;

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@muratori.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "MuratoriAdmin123!";

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashPassword(adminPassword),
      active: true,
      role: "owner",
    },
    create: {
      email: adminEmail,
      name: "Admin Muratori",
      passwordHash: hashPassword(adminPassword),
      role: "owner",
    },
  });

  const settingsCount = await prisma.settings.count();
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        branding: {
          brandName: "Muratori",
          assistantName: "Muratori · IA",
          primaryColor: "#075e54",
          secondaryColor: "#128c7e",
          logoUrl: null,
        },
        business: {
          segment: "agencia_marketing",
          description: "Agência de marketing, tráfego e performance",
          audience: "PMEs e negócios locais",
        },
        whatsapp: {
          number: "5511999999999",
          messageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
        },
        tracking: {},
      },
    });
  }

  const whatsappActive = await prisma.leadWhatsappConfig.count({
    where: { active: true },
  });
  if (whatsappActive === 0) {
    await prisma.leadWhatsappConfig.create({
      data: {
        whatsappNumber: "5511999999999",
        whatsappMessageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
        active: true,
      },
    });
  }

  await prisma.diagnosticPageConfig.upsert({
    where: { slug: "diagnostico" },
    update: {},
    create: {
      name: "Diagnóstico Agência",
      slug: "diagnostico",
      brandName: "Muratori",
      primaryColor: "#075e54",
      secondaryColor: "#128c7e",
      segmentPreset: "agencia_marketing",
      whatsappNumber: "5511999999999",
      whatsappMessageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
      checkoutUrl: "https://pay.hotmart.com/ADAPTAR",
      qualificationRule: {
        excludeRevenueLevels: ["de_10_25", "baixo", "ate_25k"],
      },
      active: true,
    },
  });

  const offer = await prisma.diagnosticOffer.findFirst({
    where: { name: "Plano Essencial" },
  });
  if (!offer) {
    await prisma.diagnosticOffer.create({
      data: {
        name: "Plano Essencial",
        price: 199.9,
        features: [
          "1 WhatsApp conectado + até 6 atendentes",
          "Chatbot e Agentes de IA (ChatGPT)",
          "CRM Kanban + histórico por lead/conta",
          "Follow-up e agendamento",
          "Mensagens ilimitadas",
          "Portal de membros",
          "Suporte e-mail/WhatsApp",
        ],
        checkoutUrl: "https://pay.hotmart.com/ADAPTAR",
        rule: {
          revenueLevels: ["de_10_25", "baixo", "ate_25k"],
        },
        active: true,
      },
    });
  }

  const flowCount = await prisma.diagnosticFlow.count({ where: { name: "default" } });
  if (flowCount === 0) {
    await prisma.diagnosticFlow.create({
      data: {
        name: "default",
        version: 1,
        definition: AGENCY_FLOW_V1,
        publishedAt: new Date(),
      },
    });
  }

  const emptySmartDef = {
    schemaVersion: 1,
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        title: "Olá!",
        description:
          "Vamos fazer um diagnóstico rápido para entender melhor o seu perfil.",
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

  const clinicDef = {
    schemaVersion: 1,
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        title: "Oi! 👋 Sou a assistente da clínica.",
        description:
          "Vou fazer umas perguntinhas rápidas pra entender seu caso e te direcionar melhor.",
      },
      {
        id: "name",
        type: "text",
        title: "Como posso te chamar?",
        placeholder: "Seu primeiro nome",
        required: true,
        mapTo: "fullName",
      },
      {
        id: "phone",
        type: "phone",
        title: "Qual o melhor WhatsApp pra gente te retornar?",
        placeholder: "(11) 99999-9999",
        required: true,
        mapTo: "phone",
      },
      {
        id: "urgency",
        type: "buttons",
        title: "Com que urgência você precisa de atendimento?",
        required: true,
        options: [
          { id: "u1", label: "Hoje / emergência", value: "hoje", scoreDelta: 40 },
          { id: "u2", label: "Esta semana", value: "semana", scoreDelta: 25 },
          { id: "u3", label: "Só pesquisando", value: "pesquisa", scoreDelta: 5 },
        ],
      },
      {
        id: "specialty",
        type: "text",
        title: "Qual especialidade ou sintoma te preocupa agora?",
        placeholder: "Ex.: dor de garganta, check-up…",
        required: true,
        mapTo: "custom:sintoma",
      },
      {
        id: "insurance",
        type: "buttons",
        title: "Você tem convênio ou prefere particular?",
        required: true,
        options: [
          { id: "i1", label: "Convênio", value: "convenio", scoreDelta: 10 },
          { id: "i2", label: "Particular", value: "particular", scoreDelta: 15 },
        ],
      },
      {
        id: "thanks",
        type: "confirmation",
        title: "Perfeito!",
        description: "Recebemos suas respostas. Em breve nossa equipe entra em contato.",
      },
    ],
    edges: [
      { id: "e1", from: "welcome", to: "name" },
      { id: "e2", from: "name", to: "phone" },
      { id: "e3", from: "phone", to: "urgency" },
      { id: "e4", from: "urgency", to: "specialty" },
      { id: "e5", from: "specialty", to: "insurance" },
      { id: "e6", from: "insurance", to: "thanks" },
    ],
  };

  const assistDef = {
    schemaVersion: 1,
    startNodeId: "welcome",
    nodes: [
      {
        id: "welcome",
        type: "message",
        title: "Olá! Assistência técnica por aqui.",
        description: "Me conta rapidinho o que aconteceu com o aparelho.",
      },
      {
        id: "name",
        type: "text",
        title: "Qual seu nome?",
        required: true,
        mapTo: "fullName",
      },
      {
        id: "phone",
        type: "phone",
        title: "WhatsApp para orçamento:",
        required: true,
        mapTo: "phone",
      },
      {
        id: "device",
        type: "buttons",
        title: "Qual aparelho?",
        required: true,
        options: [
          { id: "d1", label: "iPhone", value: "iphone", scoreDelta: 20 },
          { id: "d2", label: "Samsung", value: "samsung", scoreDelta: 15 },
          { id: "d3", label: "Outro", value: "outro", scoreDelta: 10 },
        ],
      },
      {
        id: "issue",
        type: "text",
        title: "Qual o problema?",
        placeholder: "Ex.: trocar tela, bateria…",
        required: true,
        mapTo: "custom:problema",
        scoreDelta: 10,
      },
      {
        id: "thanks",
        type: "confirmation",
        title: "Recebido!",
        description: "Vamos montar o orçamento e te chamar no WhatsApp.",
      },
    ],
    edges: [
      { id: "e1", from: "welcome", to: "name" },
      { id: "e2", from: "name", to: "phone" },
      { id: "e3", from: "phone", to: "device" },
      { id: "e4", from: "device", to: "issue" },
      { id: "e5", from: "issue", to: "thanks" },
    ],
  };

  const templates = [
    {
      slug: "diagnostico-basico",
      name: "Diagnóstico básico",
      category: "Marketing",
      definition: emptySmartDef,
      sortOrder: 0,
    },
    {
      slug: "clinica-saude",
      name: "Clínica & Saúde",
      category: "Saúde",
      definition: clinicDef,
      sortOrder: 1,
    },
    {
      slug: "assistencia-tecnica",
      name: "Assistência Técnica",
      category: "Serviços",
      definition: assistDef,
      sortOrder: 2,
    },
  ];

  for (const tpl of templates) {
    const existing = await prisma.smartFormTemplate.findFirst({
      where: { organizationId: null, slug: tpl.slug },
    });
    if (existing) {
      await prisma.smartFormTemplate.update({
        where: { id: existing.id },
        data: {
          name: tpl.name,
          category: tpl.category,
          definition: tpl.definition,
          isActive: true,
          sortOrder: tpl.sortOrder,
        },
      });
    } else {
      await prisma.smartFormTemplate.create({
        data: {
          organizationId: null,
          name: tpl.name,
          slug: tpl.slug,
          category: tpl.category,
          definition: tpl.definition,
          settings: {},
          isActive: true,
          sortOrder: tpl.sortOrder,
        },
      });
    }
  }

  console.log("✅ Seed Muratori Dash concluído");
  console.log(`   Admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
