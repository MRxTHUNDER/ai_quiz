import multer from "multer";

const DOCX_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

const MAX_DOCX_SIZE_MB = 15;

export const uploadDocxMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_DOCX_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const isDocxMime = DOCX_MIME_TYPES.has(file.mimetype);
    const isDocxExtension = /\.docx$/i.test(file.originalname);

    if (isDocxMime || isDocxExtension) {
      cb(null, true);
      return;
    }

    cb(new Error("Only .docx files are allowed"));
  },
}).single("file");
