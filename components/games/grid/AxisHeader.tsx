import { Globe2, Star, Trophy } from "lucide-react";
import { ClubBadge } from "@/components/ui/ClubBadge";
import { Flag } from "@/components/ui/Flag";
import type { GridAxis } from "@/lib/game-engine/games/grid";
import { cn } from "@/lib/utils";

export function AxisHeader({ axis, orientation }: { axis: GridAxis; orientation: "row" | "col" }) {
  const icon =
    axis.kind === "club" ? (
      <ClubBadge name={axis.label} colors={axis.colors} className="size-9 sm:size-11" />
    ) : axis.kind === "nation" && axis.country ? (
      <Flag code={axis.country} className="h-4 w-6 sm:h-5 sm:w-7" />
    ) : axis.kind === "trophy" ? (
      <Trophy className="size-5 text-gold sm:size-6" aria-hidden />
    ) : axis.label.includes("Europa") || axis.label.startsWith("Jugó en") ? (
      <Globe2 className="size-5 text-sky sm:size-6" aria-hidden />
    ) : (
      <Star className="size-5 text-grass-bright sm:size-6" aria-hidden />
    );

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-1 text-center",
        orientation === "row" && "px-0.5",
      )}
      title={axis.label}
    >
      {icon}
      <span className={cn("line-clamp-3 text-[10.5px] font-bold uppercase leading-tight tracking-wide text-chalk/90 sm:text-xs", axis.kind === "club" && "line-clamp-2")}>
        {axis.kind === "club" ? axis.shortName ?? axis.label : axis.label}
      </span>
    </div>
  );
}
