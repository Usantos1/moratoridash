import type { DiagnosisReport, FindingSeverity } from "../../lib/qualification/types";

const toneBg: Record<FindingSeverity, string> = {
  critical: "from-rose-600 to-rose-500",
  warning: "from-orange-500 to-amber-500",
  watch: "from-emerald-600 to-emerald-500",
  neutral: "from-slate-500 to-slate-400",
};

const chipTone: Record<FindingSeverity, string> = {
  critical: "bg-rose-50 text-rose-800 border-rose-200",
  warning: "bg-orange-50 text-orange-800 border-orange-200",
  watch: "bg-emerald-50 text-emerald-800 border-emerald-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

export function DiagnosisCard({
  report,
  brandName,
}: {
  report: DiagnosisReport;
  brandName: string;
}) {
  const topFindings = report.findings.slice(0, 2);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      <div className={`bg-gradient-to-r ${toneBg[report.score]} px-4 py-4 text-white`}>
        <div className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">
          {report.scoreLabel}
        </div>
        <h3 className="text-lg font-bold leading-snug">{report.headline}</h3>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {report.metrics.map((m) => (
          <div
            key={m.label}
            className={`rounded-xl border px-2 py-2 text-xs ${chipTone[m.tone]}`}
          >
            <div className="font-semibold">
              {m.emoji} {m.label}
            </div>
            <div className="mt-0.5 truncate font-bold">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <h4 className="text-sm font-bold text-slate-800">💢 O QUE DÓI AGORA</h4>
        {report.pains.map((p) => (
          <div key={p} className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {p}
          </div>
        ))}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <h4 className="text-sm font-bold text-slate-800">✨ COM O {brandName.toUpperCase()}</h4>
        {report.benefits.map((b) => (
          <div key={b} className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            ✓ {b}
          </div>
        ))}
      </div>

      <div className="space-y-2 px-3 pb-3">
        <h4 className="text-sm font-bold text-slate-800">Achados principais</h4>
        {topFindings.map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span>{f.emoji}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  f.severity === "critical"
                    ? "bg-rose-100 text-rose-700"
                    : f.severity === "warning"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {f.severity === "critical" ? "CRÍTICO" : f.severity === "warning" ? "ATENÇÃO" : "OK"}
              </span>
              {f.title}
            </div>
            <p className="mt-1 text-sm text-slate-600">{f.text}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        🎯 {report.pitch}
      </div>
    </div>
  );
}
