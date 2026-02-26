import compression from "compression";
import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { ConnectToDb } from "./db/db";
import { AdminRouter } from "./routes/admin.routes";
import { DevRouter } from "./routes/dev.routes";
import { EntranceExamRouter } from "./routes/entranceExam.routes";
import { QuestionRouter } from "./routes/question.routes";
import { SubjectRouter } from "./routes/subject.routes";
import { TestRouter } from "./routes/test.routes";
import { UploadPdfRouter } from "./routes/uploadPdf.routes";
import { UserRouter } from "./routes/user.routes";
import { UIFlagsRouter } from "./routes/uiFlags.routes";
import { JobRouter } from "./routes/job.routes";
import { NODE_ENV, PORT, productionOrigins } from "./env";
import { startQuestionWorker, stopQuestionWorker } from "./workers/questionWorker";

const app = express();

app.use(
  cors({
    credentials: true,
    origin:
      NODE_ENV === "production"
        ? productionOrigins
        : ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());
app.use(helmet());
app.use(compression());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "OK",
  });
});

app.use("/api/v1/user", UserRouter);
app.use("/api/v1/admin", AdminRouter);
app.use("/api/v1/test", TestRouter);
app.use("/api/v1/question", QuestionRouter);
app.use("/api/v1/subject", SubjectRouter);
app.use("/api/v1/entrance-exam", EntranceExamRouter);
app.use("/api/v1/upload", UploadPdfRouter);
app.use("/api/v1/dev", DevRouter);
app.use("/api/v1/ui-flags", UIFlagsRouter);
app.use("/api/v1/jobs", JobRouter);

const bootstrap = async () => {
  await ConnectToDb();

  await startQuestionWorker();
  console.log("[boot] worker started");

  const server = app.listen(PORT, () => {
    console.log(`[boot] server listening on ${PORT}`);
  });

  const shutdown = async () => {
    await stopQuestionWorker();
    server.close(() => {
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

bootstrap().catch((error) => {
  console.error("Failed to bootstrap server:", error);
  process.exit(1);
});
