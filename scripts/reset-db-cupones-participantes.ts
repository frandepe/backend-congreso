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
const emailsPath = path.join(
  repoRoot,
  "doc",
  "emails",
  "cupones-participantes.md",
);
const reportPath = path.join(
  repoRoot,
  "doc",
  "emails",
  "reporte-reset-db-cupones.md",
);

const appTables = [
  "AdminUser",
  "PaymentReceiptSubmission",
  "RegistrationSubmission",
  "DiscountCoupon",
  "DiscountEligibleParticipant",
  "CommercialPaymentReceipt",
  "CommercialSubmission",
  "CommercialDiscountCoupon",
  "CommercialDiscountEligibleExhibitor",
] as const;

const commandsExecuted = [
  "npx tsx scripts/reset-db-cupones-participantes.ts",
  "npm run build",
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ResetReport = {
  readCount: number;
  validEmails: string[];
  duplicateEmails: string[];
  invalidEmails: string[];
  tableCountsAfterReset: Record<string, number>;
};

function extractEmails(markdown: string) {
  return markdown
    .split(/\s+/)
    .map((token) =>
      token.trim().replace(/^[<({["']+|[>)}\],;:"'.]+$/g, ""),
    )
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

function assertDatabaseUrl(databaseUrl: string | undefined): asserts databaseUrl is string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }
}

function buildTruncateSql() {
  const tableList = appTables
    .map((tableName) => `public."${tableName}"`)
    .join(", ");

  return `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`;
}

function buildReport(report: ResetReport) {
  const cleanedTables = appTables.map((tableName) => `- \`${tableName}\``).join("\n");
  const counts = appTables
    .map((tableName) => `- \`${tableName}\`: ${report.tableCountsAfterReset[tableName]}`)
    .join("\n");
  const commands = commandsExecuted.map((command) => `- \`${command}\``).join("\n");

  return `# Reporte reset DB cupones participantes

Fecha: ${new Date().toISOString()}

## Metodo usado para resetear la DB

Se ejecuto un script TypeScript con Prisma Client conectado por \`DATABASE_URL\`. El reset se hizo con \`TRUNCATE TABLE ... RESTART IDENTITY CASCADE\` sobre todas las tablas de aplicacion, manteniendo schema, modelos, migraciones y archivos del proyecto. Luego se insertaron los emails validos unicos en \`DiscountEligibleParticipant\` con \`isActive = true\`.

## Tablas limpiadas/reseteadas

${cleanedTables}

## Resultado de carga

- Emails leidos: ${report.readCount}
- Emails validos insertados: ${report.validEmails.length}
- Duplicados ignorados: ${report.duplicateEmails.length}
- Invalidos ignorados: ${report.invalidEmails.length}

## Conteo final por tabla

${counts}

## Comandos ejecutados

${commands}
`;
}

async function countRows(prisma: PrismaClient) {
  const counts: Record<string, number> = {};

  for (const tableName of appTables) {
    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::bigint AS count FROM public."${tableName}"`,
    );
    counts[tableName] = Number(result[0]?.count ?? 0);
  }

  return counts;
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

    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(buildTruncateSql());
      await tx.discountEligibleParticipant.createMany({
        data: validEmails.map((email) => ({
          emailNormalized: email,
          emailOriginal: email,
          isActive: true,
        })),
        skipDuplicates: true,
      });
    });

    const tableCountsAfterReset = await countRows(prisma);

    if (tableCountsAfterReset.DiscountEligibleParticipant !== validEmails.length) {
      throw new Error(
        `Expected ${validEmails.length} discount eligible participants, found ${tableCountsAfterReset.DiscountEligibleParticipant}.`,
      );
    }

    const nonEmptyTables = Object.entries(tableCountsAfterReset).filter(
      ([tableName, count]) =>
        tableName !== "DiscountEligibleParticipant" && count !== 0,
    );

    if (nonEmptyTables.length > 0) {
      throw new Error(
        `Expected all non-target tables to be empty. Found: ${nonEmptyTables
          .map(([tableName, count]) => `${tableName}=${count}`)
          .join(", ")}.`,
      );
    }

    await fs.writeFile(
      reportPath,
      buildReport({
        readCount: rawEmails.length,
        validEmails,
        duplicateEmails,
        invalidEmails,
        tableCountsAfterReset,
      }),
      "utf8",
    );

    console.log(
      JSON.stringify(
        {
          reportPath,
          readCount: rawEmails.length,
          validInserted: validEmails.length,
          duplicatesIgnored: duplicateEmails.length,
          invalidIgnored: invalidEmails.length,
          tableCountsAfterReset,
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
