import { QualificationChat } from "../components/qualification/QualificationChat";

export function DiagnosticoPage() {
  return (
    <div className="sf-page-frame-light relative flex min-h-[100dvh] items-center justify-center overflow-hidden">
      <div className="relative z-10 flex w-full items-center justify-center px-0 sm:px-4 sm:py-6">
        <div className="sf-phone">
          <QualificationChat mode="page" />
        </div>
      </div>
    </div>
  );
}
