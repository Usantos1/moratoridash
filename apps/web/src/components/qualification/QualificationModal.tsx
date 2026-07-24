import { useEffect } from "react";
import { QualificationChat } from "./QualificationChat";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function QualificationModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div
        className="
          relative z-10 w-full overflow-hidden bg-[#efeae2] shadow-2xl
          h-[min(100dvh,844px)]
          sm:h-[min(844px,90dvh)] sm:w-[390px] sm:rounded-[2rem]
          sm:border sm:border-white/10
        "
      >
        <QualificationChat mode="modal" onClose={onClose} />
      </div>
    </div>
  );
}
