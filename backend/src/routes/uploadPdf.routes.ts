import express from "express";
import { UploadSubjectPDF, TagPDF } from "../controller/uploadPdf.controller";
import { AuthMiddleware } from "../middleware/middleware";
import { UserRole } from "../types/types";

export const UploadPdfRouter = express.Router();

// Get presigned URL for upload (admin only)
UploadPdfRouter.post(
  "/presigned-url",
  AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }),
  UploadSubjectPDF
);

// Tag PDF with subject and entrance exam (admin only)
UploadPdfRouter.post(
  "/tag",
  AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }),
  TagPDF
);
