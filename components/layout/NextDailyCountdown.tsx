"use client";

import { Clock3 } from "lucide-react";
import { useCountdownToNextDaily } from "@/lib/client/hooks";
import { cn, formatCountdown } from "@/lib/utils";

export function NextDailyCountdown({ className, label = "Nuevos desafíos en" }: { className?: string; label?: string }) {
  const ms = useCountdownToNextDaily();
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs text-mist", className)} title="Los desafíos se renuevan a las 00:00 (hora argentina)">
      <Clock3 className="size-3.5" aria-hidden />
      <span>{label}</span>
      <span className="tabular min-w-[4.5rem] font-bold text-chalk">{ms === null ? "--:--:--" : formatCountdown(ms)}</span>
    </span>
  );
}
