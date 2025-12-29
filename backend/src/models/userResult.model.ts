import { model, Schema } from "mongoose";
import { TestStatus } from "../types/types";

const userResultSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    testId: {
      type: Schema.Types.ObjectId,
      ref: "Test",
      required: true,
    },
    entranceExamId: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
    },

    answers: [
      {
        questionId: {
          type: Schema.Types.ObjectId,
          ref: "Questions",
          required: true,
        },
        selectedOption: {
          type: String,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
      },
    ],

    status: {
      type: String,
      enum: Object.values(TestStatus),
      default: TestStatus.IN_PROGRESS,
    },

    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },

    totalQuestions: {
      type: Number,
      required: true,
    },
    attemptedCount: {
      type: Number,
      default: 0,
    },
    correctCount: {
      type: Number,
      default: 0,
    },

    score: {
      type: Number,
      default: 0,
    },
    timeTaken: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

userResultSchema.index({ userId: 1, testId: 1 });
userResultSchema.index({ userId: 1, status: 1 }); // Find user's in-progress tests
userResultSchema.index({ testId: 1, score: -1 });
userResultSchema.index({ entranceExamId: 1 }); // Find results by entrance exam
userResultSchema.index({ userId: 1, entranceExamId: 1 }); // Compound: user + exam
userResultSchema.index({ createdAt: -1 }); // Get newest results first
userResultSchema.index({ userId: 1, createdAt: -1 }); // Compound: user + newest

export const UserResult = model("UserResult", userResultSchema);
