import compression from "compression";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
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

const app = express();

dotenv.config();

ConnectToDb();

const PORT = process.env.PORT || "8080";

const productionOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : [];

app.use(
  cors({
    credentials: true,
    origin:
      process.env.NODE_ENV === "production"
        ? productionOrigins
        : ["http://localhost:5173", "http://localhost:5174"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
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

app.listen(PORT, () => {
  console.log(`Server in running on port ${PORT}`);
});
