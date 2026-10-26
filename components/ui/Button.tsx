import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "gold" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-grass text-night hover:bg-grass-bright shadow-[0_8px_24px_-12px_var(--color-grass)]",
  gold: "bg-gold text-night hover:bg-gold-soft shadow-[0_8px_24px_-12px_var(--color-gold)]",
  ghost: "text-chalk hover:bg-pitch",
  outline: "border border-line-strong text-chalk hover:border-grass hover:bg-pitch",
  danger: "bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold uppercase tracking-wide transition-all active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  prefetch,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
}) {
  return (
    <Link href={href} prefetch={prefetch} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
