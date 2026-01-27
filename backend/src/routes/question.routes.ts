import express from "express";
import {
  CreateQuestions,
  GetQuestionsByCreator,
  UpdateQuestion,
  DeleteQuestion,
  DeleteQuestionsBulk,
} from "../controller/question.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const QuestionRouter = express.Router();

QuestionRouter.post("/generate", adminAuthMiddleware, CreateQuestions);
QuestionRouter.get(
  "/by-creator/:userId",
  adminAuthMiddleware,
  GetQuestionsByCreator
);
QuestionRouter.get("/by-creator", adminAuthMiddleware, GetQuestionsByCreator);
QuestionRouter.put("/:questionId", adminAuthMiddleware, UpdateQuestion);
QuestionRouter.delete("/bulk", adminAuthMiddleware, DeleteQuestionsBulk);
QuestionRouter.delete("/:questionId", adminAuthMiddleware, DeleteQuestion);
