import express from "express";
import { getUIFlags, updateUIFlags } from "../controller/uiFlags.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const UIFlagsRouter = express.Router();

// Public route - anyone can check UI flags
UIFlagsRouter.get("/", getUIFlags);

// Admin only route - update UI flags
UIFlagsRouter.put("/", adminAuthMiddleware, updateUIFlags);
