import express from "express";
import { CreateSubject, GetAllSubjects } from "../controller/subject.controller";
import { AuthMiddleware } from "../middleware/middleware";
import { UserRole } from "../types/types";

export const SubjectRouter = express.Router();

SubjectRouter.get("/", GetAllSubjects);
SubjectRouter.post("/create", AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }), CreateSubject);
