import express from "express";
import { GetJobStatusForUser } from "../controller/job.controller";
import { userAuthMiddleware } from "../middleware/middleware";

export const JobRouter = express.Router();

JobRouter.get("/:id/status", userAuthMiddleware, GetJobStatusForUser);
JobRouter.get("/:id", userAuthMiddleware, GetJobStatusForUser);
