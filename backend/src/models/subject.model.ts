import { model, Schema } from "mongoose";

const subjectSchema = new Schema(
  {
    subjectName: {
      type: String,
      required: true,
    },

    testDuration: {
      type: Number,
      required: true,
    },

    key: {
      type: String,
    },
  },

  { timestamps: true },
);

// Add these indexes:
subjectSchema.index({ subjectName: 1 }); // Find by name (if you search by name)
subjectSchema.index({ createdAt: -1 }); // Get newest subjects first

export const Subject = model("Subject", subjectSchema);
