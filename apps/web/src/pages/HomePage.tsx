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

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#0b3d36_0%,_#062820_45%,_#041c18_100%)] text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="text-xl font-bold tracking-tight">Muratori</div>
        <Link
          to="/diagnostico"
          className="rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/20"
        >
          Diagnóstico
        </Link>
      </header>

      <main className="mx-auto flex min-h-[80vh] max-w-5xl flex-col justify-center px-6 pb-20">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
          Muratori Dash
        </p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-6xl">
          Muratori
        </h1>
        <p className="mt-4 max-w-xl text-lg text-emerald-50/80">
          Diagnóstico rápido da operação da sua agência — leads, atendimento e escala.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("openQualificationModal"))
            }
            className="rounded-full bg-emerald-400 px-6 py-3 font-bold text-emerald-950 hover:bg-emerald-300"
          >
            Diagnosticar minha agência
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10"
          >
            Ver onde meus leads estão vazando
          </button>
        </div>
      </main>

      <QualificationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
