import express from "express";
import {
  AdminSignup,
  AdminSignin,
  AdminLogout,
  GetAllUsers,
  GetUserDetails,
  UpdateUser,
  DeleteUser,
  GetAllTestAttempts,
  GetTestAttemptDetails,
  GetUserProgress,
  GetPlatformStatistics,
} from "../controller/admin.controller";
import {
  GetActiveQuestionJobsForAdmin,
  GetJobStatusForAdmin,
} from "../controller/job.controller";
import { adminAuthMiddleware } from "../middleware/middleware";

export const AdminRouter = express.Router();

// Authentication routes
AdminRouter.post("/signup", AdminSignup);
AdminRouter.post("/signin", AdminSignin);
AdminRouter.post("/logout", AdminLogout);

AdminRouter.get("/profile", adminAuthMiddleware, (req, res) => {
  // req.user should always be set by adminAuthMiddleware if we reach here
  if (!req.user) {
    return res.status(401).json({
      message: "User not authenticated",
    });
  }

  res.json({
    message: "Profile data",
    data: {
      user: req.user,
    },
  });
});

// User Management routes - Require Admin authentication
AdminRouter.get("/users", adminAuthMiddleware, GetAllUsers);
AdminRouter.get("/users/:userId", adminAuthMiddleware, GetUserDetails);
AdminRouter.put("/users/:userId", adminAuthMiddleware, UpdateUser);
AdminRouter.delete("/users/:userId", adminAuthMiddleware, DeleteUser);
AdminRouter.get("/users/:userId/progress", adminAuthMiddleware, GetUserProgress);

// Test Attempt Management routes - Require Admin authentication
AdminRouter.get("/test-attempts", adminAuthMiddleware, GetAllTestAttempts);
AdminRouter.get(
  "/test-attempts/:attemptId",
  adminAuthMiddleware,
  GetTestAttemptDetails
);

// Platform Statistics - Require Admin authentication
AdminRouter.get("/statistics", adminAuthMiddleware, GetPlatformStatistics);

// Background job monitoring - Require Admin authentication
AdminRouter.get("/jobs/active", adminAuthMiddleware, GetActiveQuestionJobsForAdmin);
AdminRouter.get("/jobs/:id/status", adminAuthMiddleware, GetJobStatusForAdmin);
