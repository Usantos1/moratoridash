import { QualificationChat } from "../components/qualification/QualificationChat";

export function DiagnosticoPage() {
  return (
    <div className="flex min-h-[100dvh] items-stretch justify-center bg-[radial-gradient(circle_at_top,_#1a4a40,_#0b201c_60%)] sm:items-center sm:p-6">
      <div className="w-full overflow-hidden sm:max-w-2xl sm:rounded-3xl sm:shadow-2xl">
        <QualificationChat mode="page" />
      </div>
    </div>
  );
}
