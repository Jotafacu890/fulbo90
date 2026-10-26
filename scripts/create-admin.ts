/**
 * Crea (o promueve) un usuario administrador.
 *   npm run admin:create -- --email vos@mail.com --password "una-clave-larga" --name "Facu"
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { scrypt as scryptCb, randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { PrismaClient } from "../lib/generated/prisma/client";

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, k: number) => Promise<Buffer>;
const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const email = arg("email")?.trim().toLowerCase();
  const password = arg("password");
  const name = arg("name") ?? email?.split("@")[0];
  if (!email || !password || password.length < 8) {
    console.error('Uso: npm run admin:create -- --email vos@mail.com --password "mínimo 8 caracteres" [--name Apodo]');
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64);
  const passwordHash = `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
  await prisma.user.upsert({
    where: { email },
    create: { email, displayName: name!, passwordHash, role: "ADMIN" },
    update: { role: "ADMIN", passwordHash },
  });
  console.log(`✔ ${email} es administrador`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
