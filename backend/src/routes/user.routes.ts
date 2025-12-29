import express from "express";
import {
  Signin,
  Signup,
  Logout,
  UpdateProfile,
  GetUserProfileProgress,
  GetUserProfileStats,
} from "../controller/user.controller";
import {
  GetEntranceExamSubjects,
  GetUserTests,
  StartTest,
  GetTestQuestions,
  SubmitAnswer,
  GetTestProgress,
  EndTest,
  AbandonTest,
  TimeUpTest,
  GetTestResult,
  GetTestHistory,
} from "../controller/userTest.controller";
import {
  CheckUploadQuota,
  GetUserPresignedUrl,
  TagUserPDF,
  GenerateQuestionsDirectUser,
} from "../controller/userPdfUpload.controller";
import { userAuthMiddleware } from "../middleware/middleware";

export const UserRouter = express.Router();

UserRouter.post("/signup", Signup);
UserRouter.post("/signin", Signin);
UserRouter.post("/logout", Logout);

UserRouter.get("/profile", userAuthMiddleware, (req, res) => {
  res.json({
    message: "Profile data",
    data: {
      user: req.user,
    },
  });
});

UserRouter.get("/profile/progress", userAuthMiddleware, GetUserProfileProgress);

UserRouter.get("/profile/stats", userAuthMiddleware, GetUserProfileStats);

UserRouter.put("/me", userAuthMiddleware, UpdateProfile);

// Test selection endpoints (Phase 1)
UserRouter.get("/entrance-exams/:examId/subjects", GetEntranceExamSubjects);
UserRouter.get("/tests", GetUserTests);

// Test taking endpoints (Phase 2 & 3) - Require authentication
UserRouter.post("/test/start", userAuthMiddleware, StartTest);
UserRouter.get("/test/:testId/questions", userAuthMiddleware, GetTestQuestions);
UserRouter.post("/test/:attemptId/answer", userAuthMiddleware, SubmitAnswer);
UserRouter.get(
  "/test/:attemptId/progress",
  userAuthMiddleware,
  GetTestProgress
);

// Test ending endpoints (Phase 4) - Require authentication
UserRouter.post("/test/:attemptId/end", userAuthMiddleware, EndTest);
UserRouter.post("/test/:attemptId/abandon", userAuthMiddleware, AbandonTest);
UserRouter.post("/test/:attemptId/time-up", userAuthMiddleware, TimeUpTest);
UserRouter.get("/test/:attemptId/result", userAuthMiddleware, GetTestResult);
UserRouter.get("/test-history", userAuthMiddleware, GetTestHistory);

// User PDF upload endpoints (with quota limit) - Require authentication
UserRouter.get("/upload/check-quota", userAuthMiddleware, CheckUploadQuota);
UserRouter.post(
  "/upload/presigned-url",
  userAuthMiddleware,
  GetUserPresignedUrl
);
UserRouter.post("/upload/tag", userAuthMiddleware, TagUserPDF);
UserRouter.post(
  "/upload/generate-direct",
  userAuthMiddleware,
  GenerateQuestionsDirectUser
);
