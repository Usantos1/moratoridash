import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

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
    update: {},
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
