import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { QualificationModal } from "../components/qualification/QualificationModal";

export function HomePage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openQualificationModal", handler);
    return () => window.removeEventListener("openQualificationModal", handler);
  }, []);

  const openChat = () => setOpen(true);

  return (
    <div className="grain relative min-h-[100dvh] overflow-hidden bg-[var(--ink)] text-[#f3f7f4]">
      {/* Atmosfera full-bleed */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 70% 10%, rgba(28,59,50,0.9) 0%, transparent 55%), linear-gradient(160deg, #070b0a 0%, #0e1614 42%, #08110e 100%)",
          }}
        />
        <div className="anim-glow absolute -right-24 top-[-10%] h-[70vh] w-[70vh] rounded-full bg-[radial-gradient(circle,rgba(182,242,108,0.22),transparent_68%)] blur-2xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(28,59,50,0.55),transparent_70%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(182,242,108,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(182,242,108,0.08) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <Link to="/" className="font-display text-lg font-bold tracking-tight sm:text-xl">
          Muratori
        </Link>
        <button
          type="button"
          onClick={openChat}
          className="border border-[var(--line)] bg-white/5 px-4 py-2 text-sm font-medium text-[var(--fog)] backdrop-blur-sm transition hover:border-[var(--leaf)]/40 hover:text-white"
        >
          Diagnóstico
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-88px)] w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-10 sm:justify-center sm:px-8 sm:pb-24">
        <div className="max-w-3xl">
          <p className="anim-rise font-display text-[11px] font-bold uppercase tracking-[0.28em] text-[var(--leaf)]">
            Muratori
          </p>

          <h1 className="anim-rise anim-rise-delay-1 font-display mt-5 text-[clamp(3.2rem,12vw,7.5rem)] font-extrabold leading-[0.9] tracking-[-0.04em]">
            Muratori
          </h1>

          <p className="anim-rise anim-rise-delay-2 mt-6 max-w-md text-base leading-relaxed text-[var(--fog)] sm:text-lg">
            Diagnóstico da operação da agência: onde o lead esfria, o time trava e a mídia vaza.
          </p>

          <div className="anim-rise anim-rise-delay-3 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={openChat}
              className="bg-[var(--leaf)] px-7 py-3.5 text-sm font-bold tracking-wide text-[#0a140f] transition hover:brightness-110"
            >
              Diagnosticar minha agência
            </button>
            <Link
              to="/diagnostico"
              className="px-2 text-sm font-medium text-[var(--fog)] underline-offset-4 transition hover:text-white hover:underline"
            >
              Abrir diagnóstico em tela cheia
            </Link>
          </div>
        </div>
      </main>

      <QualificationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
