import express from "express";
import { UploadQuestionsDocx } from "../controller/uploadDocx.controller";
import { adminAuthMiddleware } from "../middleware/middleware";
import { uploadDocxMiddleware } from "../middleware/uploadDocx.middleware";

export const UploadDocxRouter = express.Router();

UploadDocxRouter.post(
  "/questions",
  adminAuthMiddleware,
  (req, res, next) => {
    uploadDocxMiddleware(req, res, (err) => {
      if (err) {
        res.status(400).json({
          message: err instanceof Error ? err.message : "Invalid file upload",
        });
        return;
      }
      next();
    });
  },
  UploadQuestionsDocx,
);
