import type { Prisma } from "@muratori/database";
import { prisma } from "@muratori/database";
import type { SmartFormDefinition } from "./types";

type BuiltinTemplate = {
  slug: string;
  name: string;
  category: string;
  description: string;
  sortOrder: number;
  definition: SmartFormDefinition;
};

function chain(ids: string[]) {
  return ids.slice(0, -1).map((from, i) => ({
    id: `e${i + 1}`,
    from,
    to: ids[i + 1]!,
  }));
}

function baseContact(welcome: { title: string; description: string }) {
  return [
    { id: "welcome", type: "message", title: welcome.title, description: welcome.description },
    {
      id: "name",
      type: "text",
      title: "Como posso te chamar?",
      placeholder: "Seu nome",
      required: true,
      mapTo: "fullName",
    },
    {
      id: "phone",
      type: "phone",
      title: "Qual o melhor WhatsApp?",
      placeholder: "(11) 99999-9999",
      required: true,
      mapTo: "phone",
    },
  ] as SmartFormDefinition["nodes"];
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    slug: "agencia-marketing",
    name: "Agência de Marketing",
    category: "Marketing",
    description: "Diagnóstico B2B com score de qualificação e handoff comercial.",
    sortOrder: 0,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Olá! Vamos diagnosticar sua operação de marketing.",
          description: "Algumas perguntas rápidas pra entender porte, desafio e urgência.",
        }),
        {
          id: "company",
          type: "text",
          title: "Qual o nome da empresa?",
          required: true,
          mapTo: "companyName",
        },
        {
          id: "role",
          type: "buttons",
          title: "Qual seu papel aí?",
          required: true,
          options: [
            { id: "r1", label: "Dono / Sócio", value: "dono", scoreDelta: 25 },
            { id: "r2", label: "Marketing", value: "marketing", scoreDelta: 15 },
            { id: "r3", label: "Outro", value: "outro", scoreDelta: 5 },
          ],
        },
        {
          id: "challenge",
          type: "buttons",
          title: "Qual o maior desafio hoje?",
          required: true,
          options: [
            { id: "c1", label: "Gerar leads", value: "leads", scoreDelta: 20 },
            { id: "c2", label: "Converter melhor", value: "converter", scoreDelta: 18 },
            { id: "c3", label: "Estruturar o funil", value: "funil", scoreDelta: 15 },
          ],
        },
        {
          id: "budget",
          type: "buttons",
          title: "Há verba mensal prevista?",
          required: true,
          options: [
            { id: "b1", label: "Até R$ 3k", value: "3k", scoreDelta: 5 },
            { id: "b2", label: "R$ 3k–10k", value: "10k", scoreDelta: 20 },
            { id: "b3", label: "Acima de R$ 10k", value: "10k+", scoreDelta: 35 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Recebido!",
          description: "Vamos analisar e retornar com um diagnóstico sob medida.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "company", "role", "challenge", "budget", "thanks"]),
    },
  },
  {
    slug: "clinica-saude",
    name: "Clínica & Saúde",
    category: "Saúde",
    description: "Triagem de urgência, especialidade e convênio.",
    sortOrder: 1,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Oi! 👋 Sou a assistente da clínica.",
          description: "Vou fazer umas perguntinhas rápidas pra entender seu caso.",
        }),
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
      edges: chain(["welcome", "name", "phone", "urgency", "specialty", "insurance", "thanks"]),
    },
  },
  {
    slug: "imobiliaria",
    name: "Imobiliária",
    category: "Imóveis",
    description: "Qualificação de compra/aluguel e faixa de investimento.",
    sortOrder: 2,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Olá! Vamos encontrar o imóvel certo.",
          description: "Responda rapidinho pra eu te indicar as melhores opções.",
        }),
        {
          id: "intent",
          type: "buttons",
          title: "Você quer comprar ou alugar?",
          required: true,
          options: [
            { id: "i1", label: "Comprar", value: "comprar", scoreDelta: 25 },
            { id: "i2", label: "Alugar", value: "alugar", scoreDelta: 15 },
          ],
        },
        {
          id: "type",
          type: "buttons",
          title: "Qual tipo de imóvel?",
          required: true,
          options: [
            { id: "t1", label: "Apartamento", value: "apto", scoreDelta: 10 },
            { id: "t2", label: "Casa", value: "casa", scoreDelta: 10 },
            { id: "t3", label: "Comercial", value: "comercial", scoreDelta: 12 },
          ],
        },
        {
          id: "budget",
          type: "buttons",
          title: "Qual a faixa de investimento?",
          required: true,
          options: [
            { id: "b1", label: "Até R$ 300k", value: "300k", scoreDelta: 8 },
            { id: "b2", label: "R$ 300k–800k", value: "800k", scoreDelta: 20 },
            { id: "b3", label: "Acima de R$ 800k", value: "800k+", scoreDelta: 35 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Ótimo!",
          description: "Vamos separar opções alinhadas e te chamar no WhatsApp.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "intent", "type", "budget", "thanks"]),
    },
  },
  {
    slug: "advocacia",
    name: "Escritório de Advocacia",
    category: "Jurídico",
    description: "Área do direito, urgência e qualificação do caso.",
    sortOrder: 3,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Olá. Sou a assistente do escritório.",
          description: "Vou entender o tipo de caso para te direcionar ao advogado certo.",
        }),
        {
          id: "area",
          type: "buttons",
          title: "Qual área do direito?",
          required: true,
          options: [
            { id: "a1", label: "Trabalhista", value: "trabalhista", scoreDelta: 15 },
            { id: "a2", label: "Família", value: "familia", scoreDelta: 12 },
            { id: "a3", label: "Empresarial", value: "empresarial", scoreDelta: 20 },
            { id: "a4", label: "Outra", value: "outra", scoreDelta: 8 },
          ],
        },
        {
          id: "urgency",
          type: "buttons",
          title: "Há prazo ou urgência?",
          required: true,
          options: [
            { id: "u1", label: "Urgente (até 7 dias)", value: "urgente", scoreDelta: 30 },
            { id: "u2", label: "Este mês", value: "mes", scoreDelta: 15 },
            { id: "u3", label: "Sem pressa", value: "pesquisa", scoreDelta: 5 },
          ],
        },
        {
          id: "summary",
          type: "text",
          title: "Resuma o caso em poucas linhas",
          required: true,
          mapTo: "custom:resumo_caso",
          scoreDelta: 10,
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Recebido.",
          description: "Um advogado especialista vai analisar e retornar.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "area", "urgency", "summary", "thanks"]),
    },
  },
  {
    slug: "estetica",
    name: "Clínica de Estética",
    category: "Beleza",
    description: "Procedimento desejado, orçamento e agenda.",
    sortOrder: 4,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Oi! Bem-vinda à clínica ✨",
          description: "Vamos descobrir o procedimento ideal pra você.",
        }),
        {
          id: "procedure",
          type: "buttons",
          title: "O que você está buscando?",
          required: true,
          options: [
            { id: "p1", label: "Facial", value: "facial", scoreDelta: 15 },
            { id: "p2", label: "Corporal", value: "corporal", scoreDelta: 15 },
            { id: "p3", label: "Harmonização", value: "harmonizacao", scoreDelta: 25 },
          ],
        },
        {
          id: "when",
          type: "buttons",
          title: "Quando pretende começar?",
          required: true,
          options: [
            { id: "w1", label: "Esta semana", value: "semana", scoreDelta: 30 },
            { id: "w2", label: "Este mês", value: "mes", scoreDelta: 18 },
            { id: "w3", label: "Só pesquisando", value: "pesquisa", scoreDelta: 5 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Perfeito!",
          description: "Vamos te enviar as opções e horários disponíveis.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "procedure", "when", "thanks"]),
    },
  },
  {
    slug: "academia-fitness",
    name: "Academia & Fitness",
    category: "Fitness",
    description: "Objetivo, plano e disponibilidade para treino.",
    sortOrder: 5,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "E aí! Bora treinar?",
          description: "Me conta seu objetivo pra indicar o plano certo.",
        }),
        {
          id: "goal",
          type: "buttons",
          title: "Qual seu objetivo principal?",
          required: true,
          options: [
            { id: "g1", label: "Emagrecer", value: "emagrecer", scoreDelta: 15 },
            { id: "g2", label: "Ganhar massa", value: "massa", scoreDelta: 15 },
            { id: "g3", label: "Saúde / condicionamento", value: "saude", scoreDelta: 12 },
          ],
        },
        {
          id: "plan",
          type: "buttons",
          title: "Interesse em qual plano?",
          required: true,
          options: [
            { id: "p1", label: "Mensal", value: "mensal", scoreDelta: 10 },
            { id: "p2", label: "Trimestral", value: "trimestral", scoreDelta: 18 },
            { id: "p3", label: "Anual", value: "anual", scoreDelta: 28 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Fechado!",
          description: "Vamos te chamar com horários de aula experimental.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "goal", "plan", "thanks"]),
    },
  },
  {
    slug: "consultoria",
    name: "Consultoria Empresarial",
    category: "Serviços",
    description: "Dor do negócio, porte e maturidade digital.",
    sortOrder: 6,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Olá! Consultoria estratégica por aqui.",
          description: "Quero entender o momento do seu negócio.",
        }),
        {
          id: "company",
          type: "text",
          title: "Nome da empresa",
          required: true,
          mapTo: "companyName",
        },
        {
          id: "size",
          type: "buttons",
          title: "Quantas pessoas na operação?",
          required: true,
          options: [
            { id: "s1", label: "1–10", value: "1-10", scoreDelta: 8 },
            { id: "s2", label: "11–50", value: "11-50", scoreDelta: 18 },
            { id: "s3", label: "50+", value: "50+", scoreDelta: 28 },
          ],
        },
        {
          id: "pain",
          type: "buttons",
          title: "Qual dor mais urgente?",
          required: true,
          options: [
            { id: "p1", label: "Processos", value: "processos", scoreDelta: 15 },
            { id: "p2", label: "Vendas", value: "vendas", scoreDelta: 20 },
            { id: "p3", label: "Gestão / pessoas", value: "gestao", scoreDelta: 15 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Obrigado!",
          description: "Vamos preparar um diagnóstico inicial e retornar.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "company", "size", "pain", "thanks"]),
    },
  },
  {
    slug: "assistencia-tecnica",
    name: "Assistência Técnica",
    category: "Serviços",
    description: "Aparelho, problema e urgência de reparo.",
    sortOrder: 7,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Olá! Assistência técnica por aqui.",
          description: "Me conta rapidinho o que aconteceu com o aparelho.",
        }),
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
      edges: chain(["welcome", "name", "phone", "device", "issue", "thanks"]),
    },
  },
  {
    slug: "infoproduto",
    name: "Infoproduto & Cursos",
    category: "Digital",
    description: "Interesse, nível e prontidão de compra.",
    sortOrder: 8,
    definition: {
      schemaVersion: 1,
      startNodeId: "welcome",
      nodes: [
        ...baseContact({
          title: "Oi! Vamos achar o curso certo pra você.",
          description: "Algumas perguntas rápidas sobre seu momento.",
        }),
        {
          id: "interest",
          type: "buttons",
          title: "O que te interessa mais?",
          required: true,
          options: [
            { id: "i1", label: "Começar do zero", value: "zero", scoreDelta: 12 },
            { id: "i2", label: "Escalar resultados", value: "escalar", scoreDelta: 20 },
            { id: "i3", label: "Trocar de carreira", value: "carreira", scoreDelta: 18 },
          ],
        },
        {
          id: "ready",
          type: "buttons",
          title: "Quando pretende começar?",
          required: true,
          options: [
            { id: "r1", label: "Agora", value: "agora", scoreDelta: 35 },
            { id: "r2", label: "Este mês", value: "mes", scoreDelta: 18 },
            { id: "r3", label: "Só pesquisando", value: "pesquisa", scoreDelta: 5 },
          ],
        },
        {
          id: "thanks",
          type: "confirmation",
          title: "Show!",
          description: "Vamos te enviar o material e próximos passos.",
        },
      ],
      edges: chain(["welcome", "name", "phone", "interest", "ready", "thanks"]),
    },
  },
];

let ensurePromise: Promise<void> | null = null;

/// Garante que os templates de sistema existam (idempotente, roda 1x por processo).
export async function ensureBuiltinTemplates() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const tpl of BUILTIN_TEMPLATES) {
        const existing = await prisma.smartFormTemplate.findFirst({
          where: { workspaceId: null, slug: tpl.slug },
        });
        const data = {
          name: tpl.name,
          category: tpl.category,
          definition: tpl.definition as unknown as Prisma.InputJsonValue,
          settings: {
            description: tpl.description,
          } as Prisma.InputJsonValue,
          isActive: true,
          sortOrder: tpl.sortOrder,
        };
        if (existing) {
          await prisma.smartFormTemplate.update({ where: { id: existing.id }, data });
        } else {
          await prisma.smartFormTemplate.create({
            data: {
              workspaceId: null,
              slug: tpl.slug,
              ...data,
            },
          });
        }
      }

      // Desativa o template antigo genérico se ainda existir.
      await prisma.smartFormTemplate.updateMany({
        where: { workspaceId: null, slug: "diagnostico-basico" },
        data: { isActive: false },
      });
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }
  await ensurePromise;
}
