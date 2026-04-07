import nodemailer from "nodemailer";
import { env } from "../config/env";

type InitialSubmissionConfirmationEmailInput = {
  to: string;
  trackingCode: string;
  registrationOptionLabel: string;
  paymentPlanLabel: string;
  totalAmountExpected: number;
  installmentAmountExpected: number | null;
  discountAppliedPercentage: number | null;
  discountAppliedAmount: number | null;
  secondInstallmentDueAt: Date | null;
};

type TrackingCodeRecoveryEmailInput = {
  to: string;
  trackingCodes: string[];
};

type DiscountCouponEmailInput = {
  to: string;
  couponCode: string;
  expiresAt: Date;
};

type CommercialSubmissionConfirmationEmailInput = {
  to: string;
  trackingCode: string;
  commercialKindLabel: string;
  commercialOptionLabel: string;
  companyName: string;
  paymentPlanLabel: string;
  totalAmountExpected: number;
  installmentAmountExpected: number | null;
  discountAppliedAmount: number | null;
  equipmentAdditionalAmount: number | null;
  secondInstallmentDueAt: Date | null;
};

type CommercialStandDiscountCouponEmailInput = {
  to: string;
  couponCode: string;
  expiresAt: Date;
};

type CommercialTrackingCodeRecoveryEmailInput = {
  to: string;
  trackingCodes: string[];
};

let transporter: nodemailer.Transporter | null = null;

const hasEmailTransportConfigured = () => {
  return Boolean(env.gmailUser && env.gmailAppPassword);
};

const formatArsCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

const formatEmailDate = (value: Date) =>
  value.toLocaleString("es-AR", {
    timeZone: "America/Buenos_Aires",
  });

const getFrontendSecondInstallmentUrl = () => {
  const frontendBaseUrl = env.corsAllowedOrigins[0];

  if (!frontendBaseUrl) {
    return "/inscripcion/segunda-cuota";
  }

  return `${frontendBaseUrl.replace(/\/+$/, "")}/inscripcion/segunda-cuota`;
};

const getFrontendRegistrationUrl = () => {
  const frontendBaseUrl = env.corsAllowedOrigins[0];

  if (!frontendBaseUrl) {
    return "/inscripcion/participantes";
  }

  return `${frontendBaseUrl.replace(/\/+$/, "")}/inscripcion/participantes`;
};

const getFrontendExhibitorsUrl = () => {
  const frontendBaseUrl = env.corsAllowedOrigins[0];

  if (!frontendBaseUrl) {
    return "/inscripcion/expositores";
  }

  return `${frontendBaseUrl.replace(/\/+$/, "")}/inscripcion/expositores`;
};

const getFrontendCommercialSecondInstallmentUrl = () => {
  const frontendBaseUrl = env.corsAllowedOrigins[0];

  if (!frontendBaseUrl) {
    return "/inscripcion/comercial/segunda-cuota";
  }

  return `${frontendBaseUrl.replace(/\/+$/, "")}/inscripcion/comercial/segunda-cuota`;
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

const buildEmailLayout = ({
  eyebrow,
  title,
  intro,
  content,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  content: string;
  footer?: string;
}) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f5f5f4;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0;padding:0;background-color:#f5f5f4;">
          <tr>
            <td align="center" style="padding:20px 12px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:680px;width:100%;background-color:#ffffff;border:1px solid #e7e5e4;">
                <tr>
                  <td style="padding:24px 20px;background-color:#f0fdf4;border-bottom:1px solid #e7e5e4;font-family:Arial,sans-serif;">
                    <div style="display:inline-block;padding:6px 10px;background-color:#ffffff;border:1px solid #d6d3d1;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#047857;">
                      ${eyebrow}
                    </div>
                    <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>
                    <div style="font-size:28px;line-height:34px;font-weight:700;color:#1c1917;">
                      ${title}
                    </div>
                    <div style="height:12px;line-height:12px;font-size:12px;">&nbsp;</div>
                    <div style="font-size:15px;line-height:24px;color:#57534e;">
                      ${intro}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 20px;">
                    ${content}
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 20px;background-color:#fafaf9;border-top:1px solid #e7e5e4;font-family:Arial,sans-serif;font-size:13px;line-height:21px;color:#78716c;">
                    ${footer ?? "Congreso Nacional de RCP"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildInfoGrid = (
  items: Array<{
    label: string;
    value: string;
    tone?: "default" | "success";
  }>,
) => {
  const cards = items
    .map((item) => {
      const background = item.tone === "success" ? "#ecfdf5" : "#fafaf9";
      const border = item.tone === "success" ? "#a7f3d0" : "#e7e5e4";
      const valueColor = item.tone === "success" ? "#065f46" : "#1c1917";

      return `
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:${background};border:1px solid ${border};">
              <tr>
                <td style="padding:14px 16px;font-family:Arial,sans-serif;">
                  <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:#78716c;">${item.label}</div>
                  <div style="height:8px;line-height:8px;font-size:8px;">&nbsp;</div>
                  <div style="font-size:18px;line-height:26px;font-weight:700;color:${valueColor};word-break:break-word;">${item.value}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
      ${cards}
    </table>
  `;
};

const buildActionBlock = ({
  label,
  href,
  helper,
}: {
  label: string;
  href: string;
  helper?: string;
}) => {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:24px;width:100%;background-color:#fafaf9;border:1px solid #e7e5e4;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="background-color:#111827;">
                <a href="${href}" style="display:inline-block;padding:12px 18px;font-family:Arial,sans-serif;font-size:14px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;">
                  ${label}
                </a>
              </td>
            </tr>
          </table>
      ${
        helper
          ? `<div style="padding-top:12px;font-family:Arial,sans-serif;font-size:13px;line-height:21px;color:#57534e;">${helper}</div>`
          : ""
      }
        </td>
      </tr>
    </table>
  `;
};

const buildParagraph = (text: string) => {
  return `<div style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:24px;color:#44403c;">${text}</div>`;
};

const buildCommercialSubmissionConfirmationEmailHtml = ({
  trackingCode,
  commercialKindLabel,
  commercialOptionLabel,
  companyName,
  paymentPlanLabel,
  totalAmountExpected,
  installmentAmountExpected,
  discountAppliedAmount,
  equipmentAdditionalAmount,
  secondInstallmentDueAt,
}: Omit<CommercialSubmissionConfirmationEmailInput, "to">) => {
  return buildEmailLayout({
    eyebrow: "Solicitud comercial recibida",
    title: "Recibimos tu comprobante",
    intro:
      "Tu envio comercial quedo registrado y ahora pasa a revision manual por parte del comite organizador.",
    content: `
      ${buildInfoGrid([
        {
          label: "Codigo de seguimiento",
          value: trackingCode,
          tone: "success",
        },
        {
          label: "Tipo",
          value: commercialKindLabel,
        },
        {
          label: "Opcion",
          value: commercialOptionLabel,
        },
        {
          label: "Empresa",
          value: companyName,
        },
        {
          label: "Modalidad",
          value: paymentPlanLabel,
        },
        {
          label: "Total esperado",
          value: formatArsCurrency(totalAmountExpected),
        },
        ...(installmentAmountExpected !== null
          ? [
              {
                label: "Importe de este envio",
                value: formatArsCurrency(installmentAmountExpected),
              },
            ]
          : []),
        ...(discountAppliedAmount
          ? [
              {
                label: "Descuento aplicado",
                value: formatArsCurrency(discountAppliedAmount),
                tone: "success" as const,
              },
            ]
          : []),
        ...(equipmentAdditionalAmount
          ? [
              {
                label: "Adicional equipamiento",
                value: formatArsCurrency(equipmentAdditionalAmount),
              },
            ]
          : []),
        ...(secondInstallmentDueAt
          ? [
              {
                label: "Vencimiento cuota 2",
                value: formatEmailDate(secondInstallmentDueAt),
              },
            ]
          : []),
      ])}
      <div style="margin-top:22px;">
        ${buildParagraph(
          "Guarda este codigo de seguimiento. Te servira para cualquier consulta manual que el comite necesite resolver sobre esta contratacion.",
        )}
        ${
          paymentPlanLabel === "2 cuotas"
            ? buildActionBlock({
                label: "Ir a segunda cuota comercial",
                href: getFrontendCommercialSecondInstallmentUrl(),
                helper:
                  "Cuando completes la transferencia restante, usa este acceso para informar la cuota 2 de la solicitud comercial.",
              })
            : ""
        }
      </div>
    `,
    footer:
      "Este correo fue enviado automaticamente por el sistema comercial del Congreso Nacional de RCP.",
  });
};

const buildCommercialStandDiscountCouponEmailHtml = ({
  couponCode,
  expiresAt,
}: Omit<CommercialStandDiscountCouponEmailInput, "to">) => {
  const exhibitorsUrl = getFrontendExhibitorsUrl();

  return buildEmailLayout({
    eyebrow: "Descuento para expositores",
    title: "Tu cupon para stand ya esta listo",
    intro:
      "Generamos un cupon exclusivo para este email. Aplicalo al contratar tu stand antes de que venza.",
    content: `
      ${buildInfoGrid([
        {
          label: "Cupon",
          value: couponCode,
          tone: "success",
        },
        {
          label: "Vence",
          value: formatEmailDate(expiresAt),
        },
      ])}
      <div style="margin-top:22px;">
        ${buildParagraph(
          "Si solicitas un nuevo cupon antes de usar este, el anterior queda invalidado automaticamente.",
        )}
        ${buildActionBlock({
          label: "Ir a expositores",
          href: exhibitorsUrl,
          helper:
            "Aplica el codigo con el mismo email habilitado para el descuento del stand.",
        })}
      </div>
    `,
    footer:
      "Este beneficio aplica solo a expositores habilitados por el comite.",
  });
};

const sendCommercialTrackingCodeRecoveryEmail = async ({
  to,
  trackingCodes,
}: CommercialTrackingCodeRecoveryEmailInput) => {
  const secondInstallmentUrl = getFrontendCommercialSecondInstallmentUrl();
  const codesHtml = trackingCodes
    .map(
      (trackingCode) => `
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;border:1px solid #e7e5e4;">
              <tr>
                <td style="padding:14px 16px;font-family:Arial,sans-serif;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0.04em;color:#111827;">
                  ${trackingCode}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
    )
    .join("");

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recuperacion de codigo para stands del Congreso",
    html: buildEmailLayout({
      eyebrow: "Recuperacion",
      title: "Encontramos tus codigos de stand",
      intro:
        "Estas son las solicitudes de stand asociadas a este email que todavia pueden servirte para seguimiento o segunda cuota.",
      content: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
          ${codesHtml}
        </table>
        ${buildActionBlock({
          label: "Abrir segunda cuota comercial",
          href: secondInstallmentUrl,
          helper:
            "Puedes usar cualquiera de estos codigos en la pantalla publica de segunda cuota comercial.",
        })}
      `,
      footer:
        "Si no solicitaste esta recuperacion, puedes ignorar este mensaje.",
    }),
  });
};

const sendInitialSubmissionConfirmationEmail = async ({
  to,
  trackingCode,
  registrationOptionLabel,
  paymentPlanLabel,
  totalAmountExpected,
  installmentAmountExpected,
  discountAppliedPercentage,
  discountAppliedAmount,
  secondInstallmentDueAt,
}: InitialSubmissionConfirmationEmailInput) => {
  const secondInstallmentUrl = getFrontendSecondInstallmentUrl();

  const infoBlocks = [
    {
      label: "Codigo de seguimiento",
      value: trackingCode,
      tone: "success" as const,
    },
    {
      label: "Inscripcion",
      value: registrationOptionLabel,
    },
    {
      label: "Modalidad",
      value: paymentPlanLabel,
    },
    {
      label: "Total esperado",
      value: formatArsCurrency(totalAmountExpected),
    },
    ...(installmentAmountExpected !== null
      ? [
          {
            label: "Importe de este envio",
            value: formatArsCurrency(installmentAmountExpected),
          },
        ]
      : []),
    ...(discountAppliedPercentage && discountAppliedAmount
      ? [
          {
            label: "Descuento aplicado",
            value: `${discountAppliedPercentage}% OFF (${formatArsCurrency(
              discountAppliedAmount,
            )})`,
            tone: "success" as const,
          },
        ]
      : []),
    ...(secondInstallmentDueAt
      ? [
          {
            label: "Vencimiento cuota 2",
            value: formatEmailDate(secondInstallmentDueAt),
          },
        ]
      : []),
  ];

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recibimos tu inscripcion al Congreso",
    html: buildEmailLayout({
      eyebrow: "Inscripcion recibida",
      title: "Recibimos tu comprobante",
      intro:
        "Tu envio quedo registrado y ahora pasa a revision manual por parte del comite organizador.",
      content: `
        ${buildInfoGrid(infoBlocks)}
        <div style="margin-top:22px;">
          ${buildParagraph(
            "Guarda este codigo de seguimiento. Lo vas a necesitar para consultar el estado de la inscripcion y, si corresponde, para informar una segunda cuota.",
          )}
          ${
            paymentPlanLabel === "2 cuotas"
              ? buildActionBlock({
                  label: "Ir a segunda cuota",
                  href: secondInstallmentUrl,
                  helper:
                    "Si elegiste pagar en 2 cuotas, usa este acceso cuando completes la transferencia restante.",
                })
              : ""
          }
        </div>
      `,
      footer:
        "Este correo fue enviado automaticamente por el sistema de inscripciones del Congreso Nacional de RCP.",
    }),
  });
};

const sendTrackingCodeRecoveryEmail = async ({
  to,
  trackingCodes,
}: TrackingCodeRecoveryEmailInput) => {
  const secondInstallmentUrl = getFrontendSecondInstallmentUrl();
  const codesHtml = trackingCodes
    .map(
      (trackingCode) => `
        <tr>
          <td style="padding:0 0 12px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background-color:#ffffff;border:1px solid #e7e5e4;">
              <tr>
                <td style="padding:14px 16px;font-family:Arial,sans-serif;font-size:18px;line-height:26px;font-weight:700;letter-spacing:0.04em;color:#111827;">
                  ${trackingCode}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `,
    )
    .join("");

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recuperacion de codigo de inscripcion",
    html: buildEmailLayout({
      eyebrow: "Recuperacion",
      title: "Encontramos tus codigos",
      intro:
        "Estas son las inscripciones asociadas a este email que todavia pueden serte utiles para seguimiento o segunda cuota.",
      content: `
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;">
          ${codesHtml}
        </table>
        ${buildActionBlock({
          label: "Abrir pantalla de segunda cuota",
          href: secondInstallmentUrl,
          helper:
            "Puedes usar cualquiera de estos codigos en la pantalla publica de segunda cuota.",
        })}
      `,
      footer:
        "Si no solicitaste esta recuperacion, puedes ignorar este mensaje.",
    }),
  });
};

const sendDiscountCouponEmail = async ({
  to,
  couponCode,
  expiresAt,
}: DiscountCouponEmailInput) => {
  const registrationUrl = getFrontendRegistrationUrl();

  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Tu cupon de descuento para el Congreso",
    html: buildEmailLayout({
      eyebrow: "Descuento 20% OFF",
      title: "Tu cupon ya esta listo",
      intro:
        "Generamos un cupon exclusivo para este email. Aplicalo en la inscripcion antes de que venza.",
      content: `
        ${buildInfoGrid([
          {
            label: "Cupon",
            value: couponCode,
            tone: "success",
          },
          {
            label: "Vence",
            value: formatEmailDate(expiresAt),
          },
        ])}
        <div style="margin-top:22px;">
          ${buildParagraph(
            "Si solicitas un nuevo cupon antes de usar este, el anterior queda invalidado automaticamente.",
          )}
          ${buildActionBlock({
            label: "Ir a la inscripcion",
            href: registrationUrl,
            helper:
              "Aplica el codigo dentro del formulario con el mismo email con el que pediste el descuento.",
          })}
        </div>
      `,
      footer:
        "El descuento esta reservado para participantes habilitados del primer congreso.",
    }),
  });
};

const sendCommercialSubmissionConfirmationEmail = async ({
  to,
  trackingCode,
  commercialKindLabel,
  commercialOptionLabel,
  companyName,
  paymentPlanLabel,
  totalAmountExpected,
  installmentAmountExpected,
  discountAppliedAmount,
  equipmentAdditionalAmount,
  secondInstallmentDueAt,
}: CommercialSubmissionConfirmationEmailInput) => {
  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Recibimos tu solicitud comercial para el Congreso",
    html: buildCommercialSubmissionConfirmationEmailHtml({
      trackingCode,
      commercialKindLabel,
      commercialOptionLabel,
      companyName,
      paymentPlanLabel,
      totalAmountExpected,
      installmentAmountExpected,
      discountAppliedAmount,
      equipmentAdditionalAmount,
      secondInstallmentDueAt,
    }),
  });
};

const sendCommercialStandDiscountCouponEmail = async ({
  to,
  couponCode,
  expiresAt,
}: CommercialStandDiscountCouponEmailInput) => {
  await getTransporter().sendMail({
    from: env.gmailUser,
    to,
    subject: "Tu cupon para stand del Congreso",
    html: buildCommercialStandDiscountCouponEmailHtml({
      couponCode,
      expiresAt,
    }),
  });
};

export {
  buildCommercialStandDiscountCouponEmailHtml,
  buildCommercialSubmissionConfirmationEmailHtml,
  hasEmailTransportConfigured,
  sendCommercialStandDiscountCouponEmail,
  sendCommercialSubmissionConfirmationEmail,
  sendCommercialTrackingCodeRecoveryEmail,
  sendDiscountCouponEmail,
  sendInitialSubmissionConfirmationEmail,
  sendTrackingCodeRecoveryEmail,
};
