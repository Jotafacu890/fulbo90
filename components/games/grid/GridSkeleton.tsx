import { Skeleton } from "@/components/ui/primitives";

export function GridSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando grilla">
      <Skeleton className="mb-4 h-11 w-full" />
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {Array.from({ length: 16 }, (_, i) => (
          <Skeleton key={i} className="aspect-square" />
        ))}
      </div>
    </div>
  );
}
