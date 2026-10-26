import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const input = "h-10 w-full rounded-lg border border-line-strong bg-night px-3 text-sm text-chalk placeholder:text-mist-2 focus:border-grass focus:outline-none disabled:opacity-50";

export function Field({ label, name, hint, className, ...props }: { label: string; name: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
      <input name={name} className={input} {...props} />
      {hint && <span className="mt-1 block text-xs text-mist-2">{hint}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  className,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  className?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
      <select name={name} defaultValue={defaultValue ?? ""} required={required} className={input}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-[var(--color-grass)]" />
      {label}
    </label>
  );
}

export function TextArea({ label, name, rows = 8, placeholder, className }: { label: string; name: string; rows?: number; placeholder?: string; className?: string }) {
  return (
    <label className={cn("block text-sm sm:col-span-2", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mist">{label}</span>
      <textarea name={name} rows={rows} placeholder={placeholder} className={cn(input, "h-auto py-2 font-mono text-xs")} />
    </label>
  );
}

export function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card p-5", className)}>
      <h2 className="display mb-4 text-2xl">{title}</h2>
      {children}
    </section>
  );
}
