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

const SYSTEM_ROLES = [
  {
    slug: "owner",
    name: "Owner",
    description: "Acesso total ao workspace",
    permissions: [
      "workspace.manage",
      "users.manage",
      "roles.manage",
      "forms.read",
      "forms.write",
      "forms.publish",
      "forms.delete",
      "leads.read",
      "leads.delete",
      "leads.export",
      "settings.read",
      "settings.write",
      "domains.manage",
      "legacy.access",
    ],
  },
  {
    slug: "admin",
    name: "Administrador",
    description: "Gerencia formulários, leads e usuários",
    permissions: [
      "users.manage",
      "forms.read",
      "forms.write",
      "forms.publish",
      "forms.delete",
      "leads.read",
      "leads.delete",
      "leads.export",
      "settings.read",
      "settings.write",
      "domains.manage",
      "legacy.access",
    ],
  },
  {
    slug: "editor",
    name: "Editor",
    description: "Cria e publica formulários",
    permissions: ["forms.read", "forms.write", "forms.publish", "leads.read", "settings.read"],
  },
  {
    slug: "comercial",
    name: "Comercial",
    description: "Trabalha os leads recebidos",
    permissions: ["forms.read", "leads.read", "leads.export"],
  },
  {
    slug: "leitor",
    name: "Leitor",
    description: "Somente leitura",
    permissions: ["forms.read", "leads.read", "settings.read"],
  },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@muratori.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "MuratoriAdmin123!";

  const workspace = await prisma.workspace.upsert({
    where: { slug: "muratori" },
    update: {},
    create: { slug: "muratori", name: "Muratori" },
  });

  for (const [index, role] of SYSTEM_ROLES.entries()) {
    await prisma.workspaceRole.upsert({
      where: { workspaceId_slug: { workspaceId: workspace.id, slug: role.slug } },
      update: { name: role.name, description: role.description, isSystem: true },
      create: {
        workspaceId: workspace.id,
        slug: role.slug,
        name: role.name,
        description: role.description,
        permissions: role.permissions,
        isSystem: true,
        sortOrder: index,
      },
    });
  }

  const ownerRole = await prisma.workspaceRole.findUnique({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "owner" } },
  });

  const admin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hashPassword(adminPassword),
      active: true,
      role: "superadmin",
    },
    create: {
      email: adminEmail,
      name: "Admin Muratori",
      passwordHash: hashPassword(adminPassword),
      role: "superadmin",
    },
  });

  await prisma.workspaceMembership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: admin.id } },
    update: { roleId: ownerRole?.id ?? null, active: true },
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      roleId: ownerRole?.id ?? null,
    },
  });

  const settingsCount = await prisma.settings.count({ where: { workspaceId: workspace.id } });
  if (settingsCount === 0) {
    await prisma.settings.create({
      data: {
        workspaceId: workspace.id,
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
    where: { workspaceId: workspace.id, active: true },
  });
  if (whatsappActive === 0) {
    await prisma.leadWhatsappConfig.create({
      data: {
        workspaceId: workspace.id,
        whatsappNumber: "5511999999999",
        whatsappMessageTemplate: DEFAULT_WHATSAPP_TEMPLATE,
        active: true,
      },
    });
  }

  await prisma.diagnosticPageConfig.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: "diagnostico" } },
    update: {},
    create: {
      workspaceId: workspace.id,
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
    where: { workspaceId: workspace.id, name: "Plano Essencial" },
  });
  if (!offer) {
    await prisma.diagnosticOffer.create({
      data: {
        workspaceId: workspace.id,
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

  const flowCount = await prisma.diagnosticFlow.count({
    where: { workspaceId: workspace.id, name: "default" },
  });
  if (flowCount === 0) {
    await prisma.diagnosticFlow.create({
      data: {
        workspaceId: workspace.id,
        name: "default",
        version: 1,
        definition: AGENCY_FLOW_V1,
        publishedAt: new Date(),
      },
    });
  }

  // Templates Smart Forms: criados/atualizados pela API em GET /forms/templates
  // (ensureBuiltinTemplates). Não duplicamos aqui.

  console.log("✅ Seed Muratori Dash concluído");
  console.log(`   Workspace: ${workspace.slug} (${workspace.id})`);
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
