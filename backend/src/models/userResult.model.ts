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

    score: {
      type: Number,
      default: 0,
    },
    timeTaken: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

userResultSchema.index({ userId: 1, testId: 1 });
userResultSchema.index({ testId: 1, score: -1 });
userResultSchema.index({ createdAt: -1 });

export const UserResult = model("UserResult", userResultSchema);
