import { Link } from "react-router-dom";
import { QualificationChat } from "../components/qualification/QualificationChat";

export function DiagnosticoPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,#1c3b32_0%,#070b0a_58%)]" />
        <div className="absolute left-1/2 top-0 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(182,242,108,0.14),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col px-0 sm:px-4 sm:py-6">
        <div className="mb-3 hidden items-center justify-between px-2 sm:flex">
          <Link to="/" className="font-display text-sm font-bold tracking-tight text-white/90">
            Muratori
          </Link>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--leaf)]/80">
            Diagnóstico
          </span>
        </div>

        <div className="min-h-[100dvh] flex-1 overflow-hidden border border-white/10 bg-[#efeae2] shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:min-h-[min(92vh,820px)] sm:rounded-[1.75rem]">
          <QualificationChat mode="page" />
        </div>
      </div>
    </div>
  );
}
