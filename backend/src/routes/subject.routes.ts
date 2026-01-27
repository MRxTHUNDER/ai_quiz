import express from "express";
import {
  CreateSubject,
  GetAllSubjects,
  UpdateSubject,
} from "../controller/subject.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const SubjectRouter = express.Router();

SubjectRouter.get("/", GetAllSubjects);
SubjectRouter.post("/create", adminAuthMiddleware, CreateSubject);
SubjectRouter.put("/:id", adminAuthMiddleware, UpdateSubject);