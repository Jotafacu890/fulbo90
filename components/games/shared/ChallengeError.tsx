import { TriangleAlert } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

export function ChallengeError({ message, slug }: { message: string; slug: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-8 text-center">
      <TriangleAlert className="size-8 text-gold" aria-hidden />
      <p className="font-semibold">{message}</p>
      <div className="flex gap-2">
        <ButtonLink href={`/juegos/${slug}`} variant="outline" size="sm">
          Desafío de hoy
        </ButtonLink>
        <ButtonLink href={`/juegos/${slug}?modo=infinito`} size="sm" prefetch={false}>
          Modo infinito
        </ButtonLink>
      </div>
    </div>
  );
}
