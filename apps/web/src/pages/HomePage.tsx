import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { QualificationModal } from "../components/qualification/QualificationModal";

const STEPS = [
  {
    n: "01",
    title: "Conversa que qualifica",
    text: "O lead responde em formato de chat — sem formulário frio, sem abandono na metade.",
  },
  {
    n: "02",
    title: "Diagnóstico na hora",
    text: "A IA lê operação, faturamento e tempo de resposta e devolve um relatório claro.",
  },
  {
    n: "03",
    title: "Oferta ou WhatsApp",
    text: "Quem cabe no plano vê o checkout. Quem precisa de conversa vai direto pro comercial.",
  },
] as const;

export function HomePage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openQualificationModal", handler);
    return () => window.removeEventListener("openQualificationModal", handler);
  }, []);

  const openChat = () => setOpen(true);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--ink)] text-[#f3f7f4]">
      {/* —— HERO —— */}
      <section className="grain relative min-h-[100dvh]">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(90% 70% at 85% 20%, rgba(28,59,50,0.95) 0%, transparent 55%), linear-gradient(155deg, #070b0a 0%, #0c1512 40%, #08110e 100%)",
            }}
          />
          <div className="anim-glow absolute -right-16 top-[-8%] h-[75vh] w-[75vh] rounded-full bg-[radial-gradient(circle,rgba(182,242,108,0.2),transparent_68%)] blur-2xl" />
          <div className="absolute bottom-[-25%] left-[-15%] h-[60vh] w-[60vh] rounded-full bg-[radial-gradient(circle,rgba(28,59,50,0.6),transparent_70%)] blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.16]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(182,242,108,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(182,242,108,0.09) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
              maskImage: "radial-gradient(ellipse at 70% 30%, black 15%, transparent 72%)",
            }}
          />
        </div>

        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
          <Link
            to="/"
            className="font-display text-lg font-extrabold tracking-tight text-white sm:text-xl"
          >
            MURATORI
          </Link>
          <nav className="flex items-center gap-4 sm:gap-6">
            <a
              href="#produto"
              className="hidden text-sm text-white/55 transition hover:text-white sm:inline"
            >
              Produto
            </a>
            <a
              href="#como-funciona"
              className="hidden text-sm text-white/55 transition hover:text-white sm:inline"
            >
              Como funciona
            </a>
            <button
              type="button"
              onClick={openChat}
              className="border border-[var(--line)] bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-[var(--leaf)]/50 hover:text-white"
            >
              Testar agora
            </button>
          </nav>
        </header>

        <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-20">
          <div className="max-w-xl">
            <h1 className="anim-rise font-display text-[clamp(3.4rem,11vw,6.75rem)] font-extrabold leading-[0.88] tracking-[-0.045em] text-white">
              MURATORI
            </h1>

            <p className="anim-rise anim-rise-delay-1 mt-6 max-w-md text-lg leading-relaxed text-[var(--fog)] sm:text-xl">
              Formulários de diagnóstico inteligentes que qualificam leads em conversa — feitos para
              agências que vendem performance.
            </p>

            <div className="anim-rise anim-rise-delay-2 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={openChat}
                className="bg-[var(--leaf)] px-7 py-3.5 text-sm font-bold tracking-wide text-[#0a140f] transition hover:brightness-110"
              >
                Experimentar o diagnóstico
              </button>
              <Link
                to="/diagnostico"
                className="px-1 text-sm font-medium text-white/55 underline-offset-4 transition hover:text-white hover:underline"
              >
                Abrir em tela cheia
              </Link>
            </div>
          </div>

          {/* Âncora visual: preview do produto (chat) full-bleed no eixo direito */}
          <div className="anim-rise anim-rise-delay-3 relative mx-auto w-full max-w-[340px] lg:mx-0 lg:justify-self-end">
            <div
              className="pointer-events-none absolute -inset-8 -z-10 rounded-full opacity-70 blur-2xl"
              style={{
                background: "radial-gradient(circle, rgba(182,242,108,0.18), transparent 65%)",
              }}
            />
            <div className="home-phone-float overflow-hidden border border-white/10 bg-[#0a1210] shadow-[0_40px_100px_rgba(0,0,0,0.55)]">
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ backgroundColor: "#075e54" }}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-900">
                  M
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Muratori · IA</div>
                  <div className="text-[11px] text-white/70">diagnóstico online</div>
                </div>
              </div>
              <div className="space-y-3 bg-[#efeae2] px-3 py-4">
                <ChatBubble bot>
                  Oi! Eu sou a IA da Muratori. Em 2 minutos mostro onde a operação da sua agência
                  trava.
                </ChatBubble>
                <ChatBubble>Beleza — quero ver o diagnóstico.</ChatBubble>
                <ChatBubble bot>
                  Quantos leads novos vocês atendem por dia no WhatsApp?
                </ChatBubble>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {["20", "50", "100", "200+"].map((n) => (
                    <span
                      key={n}
                      className="border border-emerald-600/40 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"
                    >
                      {n}/dia
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-white/5 bg-[#0e1614] px-4 py-3 text-center text-[11px] text-white/40">
                Formulário inteligente · estilo WhatsApp
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* —— PRODUTO —— */}
      <section id="produto" className="relative border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #08110e 0%, #0a1210 50%, #070b0a 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-28">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Para agências
          </p>
          <h2 className="font-display mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Pare de perder lead no formulário. Qualifique em conversa.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
            A Muratori cria e opera formulários de diagnóstico inteligentes: o visitante fala com a
            IA, você recebe lead quente com contexto de operação — nicho, volume, faturamento e
            tempo de resposta — pronto para oferta ou atendimento.
          </p>

          <div className="mt-16 grid gap-10 border-t border-white/[0.08] pt-12 md:grid-cols-3 md:gap-8">
            {[
              {
                title: "Conversão mais alta",
                text: "Chat engaja. Campos longos abandonam. O diagnóstico guia o lead até o fim.",
              },
              {
                title: "Qualificação real",
                text: "Não é só nome e e-mail. Você vê se a agência cabe no plano ou precisa de call.",
              },
              {
                title: "Pronto pra mídia",
                text: "Tracking, UTM, Meta e GA4 no fluxo — lead qualificado vira conversão mensurável.",
              },
            ].map((item) => (
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
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,rgba(28,59,50,0.35),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 sm:px-8 sm:py-28">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Como funciona
          </p>
          <h2 className="font-display mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Do clique ao lead qualificado em três atos.
          </h2>

          <ol className="mt-14 space-y-0">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="grid gap-4 border-t border-white/[0.08] py-8 md:grid-cols-[5rem_1fr_1.2fr] md:items-baseline md:gap-8"
              >
                <span className="font-display text-3xl font-extrabold text-[var(--leaf)]/80">
                  {step.n}
                </span>
                <h3 className="font-display text-2xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/50 md:text-base">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* —— CTA FINAL —— */}
      <section className="relative border-t border-white/[0.06]">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(70% 80% at 50% 100%, rgba(182,242,108,0.12) 0%, transparent 55%), #070b0a",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-24 text-center sm:px-8 sm:py-32">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Muratori
          </p>
          <h2 className="font-display mx-auto mt-5 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            Veja o formulário inteligente na prática.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base text-white/55">
            Rode o diagnóstico agora — é o mesmo fluxo que suas campanhas podem usar para qualificar
            agências e donos de operação.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openChat}
              className="bg-[var(--leaf)] px-8 py-4 text-sm font-bold text-[#0a140f] transition hover:brightness-110"
            >
              Abrir diagnóstico
            </button>
            <Link
              to="/admin/login"
              className="px-4 py-3 text-sm font-medium text-white/45 transition hover:text-white"
            >
              Acessar o painel
            </Link>
          </div>
        </div>
      </section>

      <footer className="relative border-t border-white/[0.06] px-6 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs text-white/35">
          <span className="font-display font-bold tracking-wide text-white/50">MURATORI</span>
          <span>Formulários de diagnóstico inteligentes para agências</span>
        </div>
      </footer>

      <QualificationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function ChatBubble({
  children,
  bot,
}: {
  children: ReactNode;
  bot?: boolean;
}) {
  return (
    <div className={`flex ${bot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[88%] px-3 py-2 text-[12px] leading-snug shadow-sm ${
          bot
            ? "rounded-2xl rounded-bl-md bg-white text-slate-800"
            : "rounded-2xl rounded-br-md bg-[#d9fdd3] text-slate-900"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
