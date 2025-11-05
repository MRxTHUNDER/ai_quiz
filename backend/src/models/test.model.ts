import { model, Schema } from "mongoose";

export const testModel = new Schema(
  {
    questions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Questions",
      },
    ],

    testSubject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },
  },

  { timestamps: true },
);

// Add these indexes:
testModel.index({ testSubject: 1 }); // Find tests by subject
testModel.index({ createdAt: -1 }); // Get newest tests first
testModel.index({ testSubject: 1, createdAt: -1 }); // Compound: subject + newest

export const TestModel = model("Test", testModel);
