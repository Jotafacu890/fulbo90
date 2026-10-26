import { BRAND } from "@/lib/config/brand";

/** Acceso seguro a localStorage (modo privado, SSR, cuotas llenas). */
const key = (k: string) => `${BRAND.storagePrefix}:${k}`;

export function readJSON<T>(k: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(k));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJSON(k: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(k), JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("fs-storage", { detail: k }));
  } catch {
    // Sin almacenamiento disponible: el juego sigue funcionando, sólo no se guarda el progreso.
  }
}

export function removeKey(k: string): void {
  try {
    window.localStorage.removeItem(key(k));
  } catch {}
}

/** Identificador anónimo del navegador. Se usará para migrar el historial cuando existan cuentas. */
export function anonymousId(): string {
  let id = readJSON<string>("anon-id");
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
    writeJSON("anon-id", id);
  }
  return id;
}

export function subscribeStorage(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener("fs-storage", handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener("fs-storage", handler);
  };
}
