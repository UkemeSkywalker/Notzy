import type { ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

export function Modal({ onClose, children, width = "max-w-md" }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`w-full ${width} rounded-2xl border border-black/5 bg-white p-5 shadow-2xl`}>{children}</div>
    </div>
  );
}
