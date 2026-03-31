import nodemailer from "nodemailer";
import { env } from "../config/env";

type InitialSubmissionConfirmationEmailInput = {
  to: string;
  trackingCode: string;
  registrationOptionLabel: string;
  paymentPlanLabel: string;
};

type TrackingCodeRecoveryEmailInput = {
  to: string;
  trackingCodes: string[];
};

let transporter: nodemailer.Transporter | null = null;

const hasEmailTransportConfigured = () => {
  return Boolean(env.gmailUser && env.gmailAppPassword);
};

const getFrontendSecondInstallmentUrl = () => {
  const frontendBaseUrl = env.corsAllowedOrigins[0];

  if (!frontendBaseUrl) {
    return "/inscripcion/segunda-cuota";
  }

  return `${frontendBaseUrl.replace(/\/+$/, "")}/inscripcion/segunda-cuota`;
};

const getTransporter = () => {
  if (!hasEmailTransportConfigured()) {
    throw new Error("Email transport is not configured");
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: env.gmailUser,
        pass: env.gmailAppPassword,
      },
    });
  }

  return transporter;
};

const sendInitialSubmissionConfirmationEmail = async ({
  to,
  trackingCode,
  registrationOptionLabel,
  paymentPlanLabel,
}: InitialSubmissionConfirmationEmailInput) => {
  const secondInstallmentUrl = getFrontendSecondInstallmentUrl();

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recibimos tu inscripción al Congreso",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1c1917; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Recibimos tu inscripción</h2>
        <p>Tu comprobante fue recibido y quedó pendiente de revisión manual por parte del comité organizador.</p>
        <p><strong>Código de seguimiento:</strong> ${trackingCode}</p>
        <p><strong>Opción elegida:</strong> ${registrationOptionLabel}</p>
        <p><strong>Modalidad de pago:</strong> ${paymentPlanLabel}</p>
        <p>Guarda este código para futuras consultas.</p>
        ${
          paymentPlanLabel === "2 cuotas"
            ? `<p>Si elegiste pagar en cuotas, este código también te servirá para cargar la segunda cuota desde <a href="${secondInstallmentUrl}">${secondInstallmentUrl}</a>.</p>`
            : ""
        }
      </div>
    `,
  });
};

const sendTrackingCodeRecoveryEmail = async ({
  to,
  trackingCodes,
}: TrackingCodeRecoveryEmailInput) => {
  const secondInstallmentUrl = getFrontendSecondInstallmentUrl();
  const trackingCodeList = trackingCodes
    .map((trackingCode) => `<li><strong>${trackingCode}</strong></li>`)
    .join("");

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recuperación de código de inscripción",
    html: `
      <div style="font-family: Arial, sans-serif; color: #1c1917; line-height: 1.6;">
        <h2 style="margin-bottom: 12px;">Recuperación de código de inscripción</h2>
        <p>Encontramos una o más inscripciones asociadas a este email que todavía pueden continuar el flujo de segunda cuota.</p>
        <ul>${trackingCodeList}</ul>
        <p>Puedes usar cualquiera de estos códigos en <a href="${secondInstallmentUrl}">${secondInstallmentUrl}</a>.</p>
      </div>
    `,
  });
};

export {
  hasEmailTransportConfigured,
  sendInitialSubmissionConfirmationEmail,
  sendTrackingCodeRecoveryEmail,
};
