import express from "express";
import {
  UploadSubjectPDF,
  UploadBannerImage,
  TagPDF,
  GenerateQuestionsDirect,
} from "../controller/uploadPdf.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const UploadPdfRouter = express.Router();

// Get presigned URL for upload (admin only)
UploadPdfRouter.post("/presigned-url", adminAuthMiddleware, UploadSubjectPDF);

// Get presigned URL for banner image upload (admin only)
UploadPdfRouter.post(
  "/presigned-image-url",
  adminAuthMiddleware,
  UploadBannerImage,
);

// Tag PDF with subject and entrance exam (admin only)
UploadPdfRouter.post("/tag", adminAuthMiddleware, TagPDF);

// Generate questions directly without PDF (admin only)
UploadPdfRouter.post(
  "/generate-direct",
  adminAuthMiddleware,
  GenerateQuestionsDirect,
);
