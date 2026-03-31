import multer from "multer";
import { HttpError } from "../utils/http-error";

const MAX_RECEIPT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const RECEIPT_FIELD_NAME = "receipt";
const ALLOWED_RECEIPT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 1,
    fileSize: MAX_RECEIPT_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_RECEIPT_MIME_TYPES.has(file.mimetype)) {
      callback(
        new HttpError(400, "INVALID_FILE_TYPE", "Invalid receipt file type"),
      );
      return;
    }

    callback(null, true);
  },
});

const uploadReceiptFile = upload.single(RECEIPT_FIELD_NAME);

export {
  ALLOWED_RECEIPT_MIME_TYPES,
  MAX_RECEIPT_FILE_SIZE_BYTES,
  RECEIPT_FIELD_NAME,
  uploadReceiptFile,
};
