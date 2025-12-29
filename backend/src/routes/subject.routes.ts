import express from "express";
import { CreateSubject, GetAllSubjects } from "../controller/subject.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const SubjectRouter = express.Router();

SubjectRouter.get("/", GetAllSubjects);
SubjectRouter.post("/create", adminAuthMiddleware, CreateSubject);
