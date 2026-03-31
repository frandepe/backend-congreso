import bcrypt from "bcrypt";
import { neonConfig } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

dotenv.config();

const SALT_ROUNDS = 12;

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  const adminEmail = process.env.ADMIN_SHARED_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SHARED_PASSWORD?.trim();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run the seed.");
  }

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_SHARED_EMAIL and ADMIN_SHARED_PASSWORD are required to run the seed.",
    );
  }

  neonConfig.webSocketConstructor = ws;

  const adapter = new PrismaNeon({
    connectionString: databaseUrl,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: {
        email: adminEmail,
      },
    });

    if (existingAdmin) {
      console.log(`Seed skipped: admin already exists for ${adminEmail}`);
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, SALT_ROUNDS);

    await prisma.adminUser.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        isActive: true,
      },
    });

    console.log(`Seed completed: admin created for ${adminEmail}`);
  } finally {
    await prisma.$disconnect();
  }
};

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  });
