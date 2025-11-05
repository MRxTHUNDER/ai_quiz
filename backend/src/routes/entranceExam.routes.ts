import express from "express";
import {
  createEntranceExam,
  GetAllEntranceExams,
  GetEntranceExamById,
  updateEntranceExam,
  deleteEntranceExam,
} from "../controller/entranceExam.controller";
import { AuthMiddleware } from "../middleware/middleware";
import { UserRole } from "../types/types";

export const EntranceExamRouter = express.Router();

// Public routes
EntranceExamRouter.get("/", GetAllEntranceExams);
EntranceExamRouter.get("/:id", GetEntranceExamById);

// Admin only routes
EntranceExamRouter.post("/create", AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }), createEntranceExam);
EntranceExamRouter.put("/:id", AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }), updateEntranceExam);
EntranceExamRouter.delete("/:id", AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }), deleteEntranceExam);
