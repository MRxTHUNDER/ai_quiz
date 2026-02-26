import { model, Schema } from "mongoose";
import { BackgroundJobStatus, QuestionJobType } from "../types/job.types";

const backgroundJobSchema = new Schema(
  {
    externalJobId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["generate_from_pdf", "generate_direct"],
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    entranceExamId: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
      index: true,
    },
    entranceExamName: {
      type: String,
      required: true,
    },
    requestedQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    generatedQuestions: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "partial", "cancelled"],
      required: true,
      default: "queued",
      index: true,
    },
    startedAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
    timeTaken: {
      type: String,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

backgroundJobSchema.index({ status: 1, type: 1, updatedAt: -1 });

export interface BackgroundJobDoc {
  externalJobId: string;
  type: QuestionJobType;
  userId: string;
  subjectId: string;
  subjectName: string;
  entranceExamId: string;
  entranceExamName: string;
  requestedQuestions: number;
  generatedQuestions: number;
  status: BackgroundJobStatus;
  startedAt?: Date;
  completedAt?: Date;
  timeTaken?: string | null;
}

export const BackgroundJob = model("BackgroundJob", backgroundJobSchema);
