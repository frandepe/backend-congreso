import type { UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";
import { ensureCloudinaryConfig } from "../config/cloudinary";
import { HttpError } from "../utils/http-error";

type UploadReceiptResult = {
  secureUrl: string;
  publicId: string;
  originalFilename: string;
  bytes: number;
  resourceType: string;
  mimeType: string;
};

const nowMs = () => performance.now();

const getElapsedMs = (startedAt: number) =>
  Number((nowMs() - startedAt).toFixed(1));

const uploadReceiptBuffer = async (
  file: Express.Multer.File,
): Promise<UploadReceiptResult> => {
  const { cloudinary, uploadFolder } = ensureCloudinaryConfig();
  const uploadStartedAt = nowMs();

  try {
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: uploadFolder,
          resource_type: "auto",
          use_filename: true,
          unique_filename: true,
          filename_override: file.originalname,
        },
        (error, uploadResult) => {
          if (error || !uploadResult) {
            reject(error ?? new Error("Cloudinary upload failed"));
            return;
          }

          resolve(uploadResult);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });

    console.info(
      `[submissions.uploadReceipt] status=success mimeType=${file.mimetype} localBytes=${file.size} uploadedBytes=${result.bytes} resourceType=${result.resource_type} uploadMs=${getElapsedMs(
        uploadStartedAt,
      )}`,
    );

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      originalFilename: file.originalname,
      bytes: result.bytes,
      resourceType: result.resource_type,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error(
      `[submissions.uploadReceipt] status=failed mimeType=${file.mimetype} localBytes=${file.size} uploadMs=${getElapsedMs(
        uploadStartedAt,
      )}`,
      error,
    );
    throw new HttpError(
      502,
      "CLOUDINARY_UPLOAD_FAILED",
      "Failed to upload receipt",
    );
  }
};

const destroyUploadedReceipt = async (
  publicId: string,
  resourceType: string,
): Promise<void> => {
  const { cloudinary } = ensureCloudinaryConfig();

  try {
    await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: resourceType as "image" | "raw" | "video",
    });
  } catch {
    console.error(`Failed to destroy uploaded receipt ${publicId}`);
  }
};

export { destroyUploadedReceipt, uploadReceiptBuffer };
