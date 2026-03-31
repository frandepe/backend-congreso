import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";
import ws from "ws";
import { env } from "../config/env";

declare global {
  var __prisma__: PrismaClient | undefined;
}

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({
  connectionString: env.databaseUrl,
});

const prisma =
  globalThis.__prisma__ ??
  new PrismaClient({
    adapter,
    log: ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma__ = prisma;
}

export { prisma };
