import { model, Schema } from "mongoose";

export const testModel = new Schema(
  {
    entranceExamId: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
    },

    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Questions",
      },
    ],

    testSubject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    totalQuestions: {
      type: Number,
      required: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
    },
  },

  { timestamps: true }
);

// Add these indexes:
testModel.index({ testSubject: 1 }); // Find tests by subject
testModel.index({ entranceExamId: 1 }); // Find tests by entrance exam
testModel.index({ createdAt: -1 }); // Get newest tests first
testModel.index({ testSubject: 1, createdAt: -1 }); // Compound: subject + newest
testModel.index({ entranceExamId: 1, testSubject: 1 }); // Compound: exam + subject

export const TestModel = model("Test", testModel);
