/**
 * Creates the first super admin and registers the certificate template.
 * Safe to run more than once — it updates rather than duplicating.
 *
 *   npm run seed
 */
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEMPLATE_PDF = path.resolve("templates/assets/internship-template.pdf");
const TEMPLATE_CONFIG = path.resolve("templates/internship-v1.json");
const TEMPLATE_KEY = "templates/internship-v1.pdf";

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@nextute.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password || password.length < 10) {
    throw new Error("Set SEED_ADMIN_PASSWORD in .env to at least 10 characters before seeding.");
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      email,
      name: process.env.SEED_ADMIN_NAME ?? "Nextute Admin",
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
    },
  });

  console.log(`Super admin ready: ${user.email}`);
}

async function seedTemplate() {
  const config = JSON.parse(await readFile(TEMPLATE_CONFIG, "utf8"));

  const pdf = await readFile(TEMPLATE_PDF).catch(() => null);
  if (!pdf) {
    console.warn(
      `\nNo template PDF at ${TEMPLATE_PDF}.\n` +
        `Put the certificate design there and run the seed again — nothing can be issued without it.\n`,
    );
    return;
  }

  // Storage is written directly here rather than through the app's driver so the
  // seed works before the server has ever started.
  const { storage } = await import("../src/lib/storage");
  await storage().put(TEMPLATE_KEY, new Uint8Array(pdf), "application/pdf");

  const template = await prisma.template.upsert({
    where: { name_version: { name: config.label, version: config.version } },
    update: { config, fileKey: TEMPLATE_KEY, isActive: true },
    create: { name: config.label, version: config.version, config, fileKey: TEMPLATE_KEY, isActive: true },
  });

  // Only one active version at a time, so the create form is never ambiguous.
  await prisma.template.updateMany({
    where: { name: template.name, id: { not: template.id } },
    data: { isActive: false },
  });

  console.log(`Template ready: ${template.name} v${template.version}`);
}

async function main() {
  await seedAdmin();
  await seedTemplate();
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
