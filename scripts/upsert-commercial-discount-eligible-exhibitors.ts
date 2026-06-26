import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");
const emailsPath = path.join(repoRoot, "doc", "emails", "cupones-expositores.md");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertDatabaseUrl(databaseUrl: string | undefined): asserts databaseUrl is string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }
}

function extractEmails(markdown: string) {
  return markdown
    .split(/\s+/)
    .map((token) => token.trim().replace(/^[<({["']+|[>)}\],;:"'.]+$/g, ""))
    .filter((token) => token.includes("@"));
}

function normalizeEmails(rawEmails: string[]) {
  const seen = new Set<string>();
  const validEmails: string[] = [];
  const duplicateEmails: string[] = [];
  const invalidEmails: string[] = [];

  for (const rawEmail of rawEmails) {
    const normalized = rawEmail.trim().toLowerCase();

    if (!emailRegex.test(normalized)) {
      invalidEmails.push(rawEmail);
      continue;
    }

    if (seen.has(normalized)) {
      duplicateEmails.push(normalized);
      continue;
    }

    seen.add(normalized);
    validEmails.push(normalized);
  }

  return { validEmails, duplicateEmails, invalidEmails };
}

async function main() {
  assertDatabaseUrl(process.env.DATABASE_URL);
  neonConfig.webSocketConstructor = ws;

  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter, log: ["error"] });

  try {
    const markdown = await fs.readFile(emailsPath, "utf8");
    const rawEmails = extractEmails(markdown);
    const { validEmails, duplicateEmails, invalidEmails } = normalizeEmails(rawEmails);

    const existingRows = await prisma.commercialDiscountEligibleExhibitor.findMany({
      where: {
        emailNormalized: {
          in: validEmails,
        },
      },
      select: {
        emailNormalized: true,
        isActive: true,
      },
    });
    const existingByEmail = new Map(
      existingRows.map((row) => [row.emailNormalized, row]),
    );

    await prisma.$transaction(
      validEmails.map((email) =>
        prisma.commercialDiscountEligibleExhibitor.upsert({
          where: {
            emailNormalized: email,
          },
          create: {
            emailNormalized: email,
            emailOriginal: email,
            isActive: true,
          },
          update: {
            emailOriginal: email,
            isActive: true,
          },
        }),
      ),
    );

    const inserted = validEmails.filter((email) => !existingByEmail.has(email));
    const reactivated = validEmails.filter(
      (email) => existingByEmail.get(email)?.isActive === false,
    );
    const alreadyActive = validEmails.filter(
      (email) => existingByEmail.get(email)?.isActive === true,
    );

    console.log(
      JSON.stringify(
        {
          target: "CommercialDiscountEligibleExhibitor",
          emailsPath,
          readCount: rawEmails.length,
          validEmails: validEmails.length,
          inserted: inserted.length,
          reactivated: reactivated.length,
          alreadyActive: alreadyActive.length,
          duplicatesIgnored: duplicateEmails.length,
          invalidIgnored: invalidEmails.length,
          insertedEmails: inserted,
          reactivatedEmails: reactivated,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
