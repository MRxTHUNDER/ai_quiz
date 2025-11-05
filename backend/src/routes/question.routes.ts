import express from "express";
import { CreateQuestions } from "../controller/question.controller";

export const QuestionRouter = express.Router();

QuestionRouter.post("/generate", CreateQuestions);
