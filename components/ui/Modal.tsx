"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Modal accesible sobre <dialog> nativo (foco atrapado, Escape, fondo). */
export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // showModal mueve el foco al diálogo: lo devolvemos al campo marcado con autofocus.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "card m-auto w-[min(32rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto p-0 text-chalk backdrop:bg-night/75 backdrop:backdrop-blur-sm open:animate-rise",
        className,
      )}
    >
      <div className="relative p-5 sm:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-mist hover:bg-pitch hover:text-chalk"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>
        {title && <h2 className="display mb-4 pr-10 text-3xl">{title}</h2>}
        {children}
      </div>
    </dialog>
  );
}
