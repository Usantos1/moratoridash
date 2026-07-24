/** Preset agencia_marketing — fluxo v1 (CommonJS para seed/runtime) */
const AGENCY_FLOW_V1 = {
  version: 1,
  name: "default",
  segment: "agencia_marketing",
  brandVars: { assistantLabel: "{brand} · IA" },
  steps: [
    {
      key: "name",
      type: "text",
      field_key: "name",
      required: true,
      bot_text:
        "Oi! Eu sou a IA do {brand} 👋 Vou fazer um diagnóstico rápido da operação da sua agência.\n\nComo posso te chamar?",
      error: "Me conta seu nome completo 🙂",
    },
    {
      key: "email",
      type: "email",
      field_key: "email",
      required: true,
      bot_text: "Prazer, {primeiroNome}! Qual o melhor e-mail pra eu te enviar o resultado?",
    },
    {
      key: "phone",
      type: "phone_br",
      field_key: "phone",
      required: true,
      bot_text:
        "Beleza! Qual seu WhatsApp com DDD? Uso só pra te enviar o resultado do diagnóstico 🙂",
    },
    {
      key: "company",
      type: "text",
      field_key: "company_name",
      required: true,
      bot_text: "Beleza, {primeiroNome}. Qual o nome da sua agência?",
    },
    {
      key: "attendants",
      type: "number_or_choice",
      field_key: "number_of_attendants",
      required: true,
      bot_text:
        "{primeiroNome}, quantas pessoas cuidam de atendimento e comercial hoje? (CS, closer, SDR, social…)",
      options: ["1", "2", "3", "4", "5", "6", "7", "8", "10", "12", "15", "20", "25", "30", "40", "50+"],
    },
    {
      key: "niches",
      type: "multi_choice",
      field_key: "niches",
      required: true,
      bot_text: "Quais nichos a agência atende hoje? Pode marcar mais de um.",
    },
    {
      key: "clients",
      type: "number_or_choice",
      field_key: "clients_per_day",
      required: true,
      bot_text:
        "Quantos leads novos vocês atendem por dia no WhatsApp, aproximadamente? (próprios + dos clientes)",
      options: ["5", "10", "20", "30", "50", "80", "100", "150", "200", "300", "500+"],
    },
    {
      key: "revenue",
      type: "single_choice_cards",
      field_key: "revenue_level",
      required: true,
      bot_text: "{primeiroNome}, qual a faixa de faturamento mensal da agência?",
    },
    {
      key: "response",
      type: "single_choice_cards",
      field_key: "response_time",
      required: true,
      bot_text:
        "Última pergunta: quanto tempo a equipe leva pra responder um lead novo que chega do anúncio ou do site?",
    },
    {
      key: "result",
      type: "system_report",
      field_key: null,
      bot_text: "{primeiroNome}, analisei a operação da agência. Olha o que encontrei:",
    },
  ],
  branching: [
    {
      when: { field: "revenue_level", in: ["de_10_25", "baixo", "ate_25k"] },
      then: { offer: "plano_essencial" },
      else: { cta: "whatsapp" },
    },
  ],
  diagnosis_preset: "agencia_marketing",
};

module.exports = { AGENCY_FLOW_V1 };
