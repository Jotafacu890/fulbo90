import { Skeleton } from "@/components/ui/primitives";

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label="Cargando desafío" className="space-y-2">
      <Skeleton className="mb-4 h-11 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
