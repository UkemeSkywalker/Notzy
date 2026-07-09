import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

interface MenuProps {
  trigger: ReactNode;
  align?: "left" | "right";
  children: ReactNode;
}

export function Menu({ trigger, align = "right", children }: MenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative no-drag" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-black/5 hover:text-slate-600"
      >
        {trigger}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={`absolute z-30 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-black/5 bg-white py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  onClick,
  children,
  danger,
}: {
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left text-[13px] hover:bg-black/5 ${
        danger ? "text-red-600" : "text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
