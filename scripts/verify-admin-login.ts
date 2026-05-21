import "dotenv/config";
import { loginAdmin } from "../src/services/auth.service";
import { prisma } from "../src/lib/prisma";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required.");
}

async function main() {
  const result = await loginAdmin({ email, password });

  console.log(
    JSON.stringify(
      {
        email: result.admin.email,
        role: result.admin.role,
        isActive: result.admin.isActive,
        tokenCreated: Boolean(result.token),
      },
      null,
      2,
    ),
  );
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
