import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const FEATURES = [
  {
    title: "Builder com ramificações",
    text: "Monte o fluxo com blocos, condições e simulador no celular — publique quando estiver pronto.",
  },
  {
    title: "Leads com contexto real",
    text: "Respostas com título, UTM, dispositivo e temperatura (Quente, Morno, Frio) no mesmo painel.",
  },
  {
    title: "Tracking e domínio",
    text: "Meta Pixel, GTM, GA4, Google Ads e CAPI — mais domínio customizado no formulário.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Escolha um template",
    text: "Comece por um modelo do seu nicho ou do zero — Marketing, Saúde, Imóveis e mais.",
  },
  {
    n: "02",
    title: "Ajuste e publique",
    text: "Edite perguntas, score, visual e tracking. O simulador mostra o chat antes de ir ao ar.",
  },
  {
    n: "03",
    title: "O lead responde em conversa",
    text: "No celular, o formulário parece um chat — opções, ramificações e abandono controlado.",
  },
  {
    n: "04",
    title: "Receba o lead qualificado",
    text: "No Dash você vê contato, respostas, origem e temperatura — pronto pro comercial.",
  },
] as const;

const NICHES = [
  "Agência de Marketing",
  "Clínica & Saúde",
  "Imobiliária",
  "Advocacia",
  "Estética",
  "Academia & Fitness",
  "Consultoria",
  "Infoproduto & Cursos",
] as const;

export function HomePage() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--ink)] text-[#f5f0ec]">
      {/* —— HERO —— */}
      <section className="grain relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 70% at 88% 18%, rgba(59,24,18,0.92) 0%, transparent 55%), linear-gradient(155deg, #0a0a0a 0%, #141110 42%, #0f0c0b 100%)",
            }}
          />
          <div className="anim-glow absolute -right-20 top-[-10%] h-[78vh] w-[78vh] rounded-full bg-[radial-gradient(circle,rgba(249,76,48,0.24),transparent_68%)] blur-2xl" />
          <div className="absolute bottom-[-28%] left-[-18%] h-[58vh] w-[58vh] rounded-full bg-[radial-gradient(circle,rgba(59,24,18,0.7),transparent_70%)] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(249,76,48,0.11) 1px, transparent 1px), linear-gradient(90deg, rgba(249,76,48,0.11) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at 72% 28%, black 12%, transparent 72%)",
            }}
          />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <Link to="/" className="inline-flex items-baseline gap-1.5 select-none">
            <span className="text-lg font-extrabold tracking-tight text-[#6ba3ff] sm:text-xl">
              MURATORI
            </span>
            <span className="text-lg font-extrabold tracking-tight text-[var(--leaf)] sm:text-xl">
              DASH
            </span>
          </Link>
          <Link
            to="/admin/login"
            className="border border-[var(--line)] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-[var(--leaf)]/50 hover:text-white"
          >
            Entrar
          </Link>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-6xl items-center gap-12 px-6 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-20">
          <div className="max-w-xl">
            <h1 className="anim-rise font-display text-[clamp(2.35rem,7.5vw,4.25rem)] font-extrabold leading-[0.95] tracking-[-0.04em] text-white">
              Formulários inteligentes que qualificam em conversa.
            </h1>
            <p className="anim-rise anim-rise-delay-1 mt-6 max-w-md text-lg leading-relaxed text-[var(--fog)] sm:text-xl">
              Builder, chat estilo WhatsApp e lead score no mesmo painel — do template ao lead
              quente.
            </p>
            <div className="anim-rise anim-rise-delay-2 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/admin/login"
                className="inline-flex items-center justify-center bg-[var(--leaf)] px-7 py-3.5 text-sm font-bold tracking-wide text-white transition hover:brightness-110"
              >
                Entrar no painel
              </Link>
              <Link
                to="/diagnostico"
                className="px-1 text-sm font-medium text-white/55 underline-offset-4 transition hover:text-white hover:underline"
              >
                Ver formulário ao vivo
              </Link>
            </div>
          </div>

          <div className="anim-rise anim-rise-delay-3 relative mx-auto w-full max-w-[300px] lg:mx-0 lg:max-w-[320px] lg:justify-self-end">
            <div
              className="pointer-events-none absolute -inset-10 -z-10 rounded-full opacity-80 blur-2xl"
              style={{
                background: "radial-gradient(circle, rgba(249,76,48,0.22), transparent 65%)",
              }}
            />
            <PhonePreview />
          </div>
        </div>
      </section>

      {/* —— O QUE O SISTEMA FAZ —— */}
      <section id="produto" className="relative border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #0f0c0b 0%, #121010 50%, #0a0a0a 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-28">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            O que o sistema faz
          </p>
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Tudo que você usa no Dash — em um fluxo só.
          </h2>

          <div className="mt-16 grid gap-10 border-t border-white/[0.08] pt-12 md:grid-cols-3 md:gap-8">
            {FEATURES.map((item) => (
              <div key={item.title}>
                <div className="h-px w-10 bg-[var(--leaf)]" />
                <h3 className="font-display mt-5 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/50">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* —— COMO FUNCIONA —— */}
      <section id="como-funciona" className="relative border-t border-white/[0.06]">
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(59,24,18,0.4),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-28">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Como funciona
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Do template ao lead qualificado.
          </h2>

          <ol className="mt-14 space-y-0">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="grid gap-4 border-t border-white/[0.08] py-8 md:grid-cols-[5rem_1fr_1.2fr] md:items-baseline md:gap-8"
              >
                <span className="font-display text-3xl font-extrabold text-[var(--leaf)]/85">
                  {step.n}
                </span>
                <h3 className="font-display text-2xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/50 md:text-base">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* —— NICHOS / TEMPLATES —— */}
      <section className="relative border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "linear-gradient(180deg, #0a0a0a 0%, #121010 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-28">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Templates
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Pronto para o seu nicho.
          </h2>
          <p className="mt-4 max-w-xl text-base text-white/50">
            Modelos do sistema pra começar rápido — ou monte o seu do zero no builder.
          </p>

          <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/[0.08] pt-10">
            {NICHES.map((name) => (
              <li
                key={name}
                className="font-display text-lg font-semibold tracking-tight text-white/80 sm:text-xl"
              >
                <span className="mr-2 text-[var(--leaf)]">·</span>
                {name}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* —— CTA FINAL —— */}
      <section className="relative border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 80% at 50% 100%, rgba(249,76,48,0.16) 0%, transparent 55%), #0a0a0a",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:px-8 sm:py-32">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Muratori Dash
          </p>
          <h2 className="font-display mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Abra o painel e publique seu primeiro formulário.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-white/55">
            Workspaces, usuários, cargos e Smart Forms — tudo no mesmo lugar.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/admin/login"
              className="inline-flex items-center justify-center bg-[var(--leaf)] px-8 py-4 text-sm font-bold text-white transition hover:brightness-110"
            >
              Entrar no painel
            </Link>
            <Link
              to="/diagnostico"
              className="px-4 py-3 text-sm font-medium text-white/45 transition hover:text-white"
            >
              Ver formulário ao vivo
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06] px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-white/35">
          <span className="inline-flex items-baseline gap-1.5 font-display font-bold tracking-wide">
            <span className="text-white/55">MURATORI</span>
            <span className="text-[var(--leaf)]/80">DASH</span>
          </span>
          <Link to="/admin/login" className="transition hover:text-white/70">
            Acessar o painel
          </Link>
        </div>
      </footer>
    </div>
  );
}

function PhonePreview() {
  return (
    <div className="home-phone-float overflow-hidden rounded-[1.75rem] border-[5px] border-[#1a1a1a] bg-[#0b141a] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5"
        style={{ backgroundColor: "#128c7e" }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[11px] font-extrabold text-[#0d655b]">
          SF
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-white">Clínica & Saúde</div>
          <div className="text-[10px] text-white/65">formulário inteligente</div>
        </div>
      </div>

      <div className="space-y-2.5 bg-[#efeae2] px-3 py-3.5">
        <ChatBubble bot>
          Olá! Vamos entender seu perfil em poucos passos para indicar o melhor atendimento.
        </ChatBubble>
        <ChatBubble>Quero marcar uma avaliação.</ChatBubble>
        <ChatBubble bot>Qual é a sua principal necessidade hoje?</ChatBubble>
        <div className="flex flex-col gap-1.5 pt-0.5">
          {["Consulta", "Exame", "Retorno", "Urgência"].map((opt) => (
            <span
              key={opt}
              className="rounded-xl bg-white px-3 py-2 text-left text-[11px] font-semibold text-slate-800 shadow-sm"
              style={{ boxShadow: "inset 3px 0 0 #128c7e" }}
            >
              {opt}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-white/5 bg-[#1a1a1a] px-3.5 py-2.5">
        <span className="text-[10px] font-medium text-white/40">Lead score</span>
        <span className="rounded-full bg-[var(--leaf)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--leaf)]">
          Quente
        </span>
      </div>
    </div>
  );
}

function ChatBubble({ children, bot }: { children: ReactNode; bot?: boolean }) {
  return (
    <div className={`flex ${bot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[90%] px-2.5 py-1.5 text-[11.5px] leading-snug shadow-sm ${
          bot
            ? "rounded-2xl rounded-bl-md bg-white text-slate-800"
            : "rounded-2xl rounded-br-md bg-[#dcf8c6] text-slate-900"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
