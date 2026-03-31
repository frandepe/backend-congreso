import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 3001;
const ALLOWED_NODE_ENVS = ["development", "test", "production"] as const;

type NodeEnv = (typeof ALLOWED_NODE_ENVS)[number];

const parsePort = (value: string | undefined): number => {
  const port = Number(value);

  if (Number.isInteger(port) && port > 0) {
    return port;
  }

  return DEFAULT_PORT;
};

const parseNodeEnv = (value: string | undefined): NodeEnv => {
  if (value && ALLOWED_NODE_ENVS.includes(value as NodeEnv)) {
    return value as NodeEnv;
  }

  return "development";
};

const parseCorsAllowedOrigins = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  nodeEnv: parseNodeEnv(process.env.NODE_ENV),
  port: parsePort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1d",
  gmailUser: process.env.GMAIL_USER ?? "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD ?? "",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  cloudinaryUploadFolder:
    process.env.CLOUDINARY_UPLOAD_FOLDER ?? "congreso-rcp/receipts",
  corsAllowedOrigins: parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
};
