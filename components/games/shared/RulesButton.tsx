"use client";

import { Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function RulesButton({ title, rules }: { title: string; rules: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} aria-label={`Cómo se juega ${title}`}>
        <Info className="size-4" /> Reglas
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Cómo se juega">
        <ol className="space-y-3">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm leading-relaxed text-chalk/90">
              <span className="display grid size-7 shrink-0 place-items-center rounded-lg bg-pitch text-lg text-gold">{i + 1}</span>
              <span className="pt-1">{r}</span>
            </li>
          ))}
        </ol>
        <Button className="mt-5 w-full" onClick={() => setOpen(false)}>
          ¡Vamos!
        </Button>
      </Modal>
    </>
  );
}
