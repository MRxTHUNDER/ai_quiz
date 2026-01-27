import express from "express";
import {
  createEntranceExam,
  GetAllEntranceExams,
  GetEntranceExamById,
  updateEntranceExam,
  deleteEntranceExam,
  updateExamOrder,
} from "../controller/entranceExam.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const EntranceExamRouter = express.Router();

// Public routes
EntranceExamRouter.get("/", GetAllEntranceExams);
EntranceExamRouter.get("/:id", GetEntranceExamById);

// Admin only routes
EntranceExamRouter.post("/create", adminAuthMiddleware, createEntranceExam);
EntranceExamRouter.put("/:id", adminAuthMiddleware, updateEntranceExam);
EntranceExamRouter.post("/reorder", adminAuthMiddleware, updateExamOrder);
EntranceExamRouter.delete("/:id", adminAuthMiddleware, deleteEntranceExam);
