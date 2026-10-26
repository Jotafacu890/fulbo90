import {
  ArrowRightLeft,
  CircleHelp,
  Grid3x3,
  History,
  Link2,
  Network,
  Route,
  Shield,
  Shirt,
  Sprout,
  Swords,
  Trophy,
  Triangle,
  UserX,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import type { GameIconName } from "@/lib/games/registry";
import { cn } from "@/lib/utils";

const ICONS: Record<GameIconName, LucideIcon> = {
  lineup: Shirt,
  grid: Grid3x3,
  question: CircleHelp,
  impostor: UserX,
  connections: Network,
  pyramid: Triangle,
  path: Waypoints,
  shield: Shield,
  history: History,
  seed: Sprout,
  link: Link2,
  versus: ArrowRightLeft,
  route: Route,
  trophy: Trophy,
  derby: Swords,
};

const ACCENTS = {
  green: "text-grass-bright bg-grass/12 ring-grass/30",
  gold: "text-gold bg-gold/12 ring-gold/30",
  sky: "text-sky bg-sky/12 ring-sky/30",
  red: "text-danger bg-danger/12 ring-danger/30",
};

export function GameIcon({ name, accent = "green", className }: { name: GameIconName; accent?: keyof typeof ACCENTS; className?: string }) {
  const Icon = ICONS[name];
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1", ACCENTS[accent], className)}>
      <Icon className="size-5.5" strokeWidth={2.2} aria-hidden />
    </span>
  );
}
