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
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="sf-phone relative z-10 sm:h-[min(860px,92dvh)]">
        <QualificationChat mode="modal" onClose={onClose} />
      </div>
    </div>
  );
}
