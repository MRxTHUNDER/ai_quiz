import express from "express";
import {
  UploadSubjectPDF,
  TagPDF,
  GenerateQuestionsDirect,
} from "../controller/uploadPdf.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const UploadPdfRouter = express.Router();

// Get presigned URL for upload (admin only)
UploadPdfRouter.post("/presigned-url", adminAuthMiddleware, UploadSubjectPDF);

// Tag PDF with subject and entrance exam (admin only)
UploadPdfRouter.post("/tag", adminAuthMiddleware, TagPDF);

// Generate questions directly without PDF (admin only)
UploadPdfRouter.post(
  "/generate-direct",
  adminAuthMiddleware,
  GenerateQuestionsDirect
);
