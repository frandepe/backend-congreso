import dotenv from "dotenv";
import { Resend } from "resend";

dotenv.config();

const DEV_FROM = "onboarding@resend.dev";
const REPLY_TO = "congresonacionalrcp@gmail.com";

const getArgValue = (name: string) => {
  const prefix = `${name}=`;
  const inlineArg = process.argv.find((arg) => arg.startsWith(prefix));

  if (inlineArg) {
    return inlineArg.slice(prefix.length).trim();
  }

  const argIndex = process.argv.indexOf(name);

  if (argIndex >= 0) {
    return process.argv[argIndex + 1]?.trim() ?? "";
  }

  return "";
};

const main = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("This Resend dev verification script cannot run in production.");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to =
    getArgValue("--to") ||
    process.env.RESEND_DEV_TEST_TO?.trim() ||
    "";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required.");
  }

  if (!to) {
    throw new Error(
      "Recipient is required. Use `npm run qa:resend-dev -- --to test@example.com` or RESEND_DEV_TEST_TO.",
    );
  }

  const resend = new Resend(apiKey);
  const startedAt = performance.now();

  console.info(
    `[email.resend.dev-test] status=starting from=${DEV_FROM} replyTo=${REPLY_TO}`,
  );

  const result = await resend.emails.send({
    from: DEV_FROM,
    to,
    replyTo: REPLY_TO,
    subject: "Prueba local Resend - Congreso Nacional de RCP",
    text:
      "Prueba local/dev de Resend. Si recibiste este email, el SDK y RESEND_API_KEY funcionan.",
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1c1917;">
        <h1 style="font-size:20px;margin:0 0 12px;">Prueba local Resend</h1>
        <p style="margin:0 0 12px;">Si recibiste este email, el SDK de Resend y RESEND_API_KEY funcionan.</p>
        <p style="margin:0;">Este remitente onboarding@resend.dev debe usarse solo en local/dev.</p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(`${result.error.name}: ${result.error.message}`);
  }

  console.info(
    `[email.resend.dev-test] status=success sendMs=${Number(
      (performance.now() - startedAt).toFixed(1),
    )} providerMessageId=${result.data?.id ?? "missing"}`,
  );
};

main().catch((error) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage =
    error instanceof Error ? error.message : "Unknown resend dev test error";

  console.error(
    `[email.resend.dev-test] status=failed errorName=${errorName} errorMessage=${errorMessage}`,
  );
  process.exitCode = 1;
});
