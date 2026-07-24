import { QualificationChat } from "../components/qualification/QualificationChat";

export function DiagnosticoPage() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(90%_60%_at_50%_0%,#1c3b32_0%,#070b0a_58%)]" />
        <div className="absolute left-1/2 top-0 h-[40vh] w-[70vw] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(182,242,108,0.14),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 flex w-full items-center justify-center px-0 sm:px-4 sm:py-6">
        <div
          className="
            flex h-[100dvh] w-full flex-col overflow-hidden bg-[#efeae2]
            sm:h-[min(844px,90dvh)] sm:w-[390px] sm:rounded-[2rem]
            sm:border sm:border-white/15 sm:shadow-[0_40px_100px_rgba(0,0,0,0.55)]
          "
        >
          <QualificationChat mode="page" />
        </div>
      </div>
    </div>
  );
}
