import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { HttpError } from "../utils/http-error";

let isCloudinaryConfigured = false;

const ensureCloudinaryConfig = () => {
  if (
    !env.cloudinaryCloudName ||
    !env.cloudinaryApiKey ||
    !env.cloudinaryApiSecret
  ) {
    throw new HttpError(
      500,
      "CLOUDINARY_CONFIGURATION_ERROR",
      "Cloudinary is not configured",
    );
  }

  if (!isCloudinaryConfigured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });

    isCloudinaryConfigured = true;
  }

  return {
    cloudinary,
    uploadFolder: env.cloudinaryUploadFolder,
  };
};

export { ensureCloudinaryConfig };
