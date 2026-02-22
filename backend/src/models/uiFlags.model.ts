import { model, Schema } from "mongoose";

const uiFlagsSchema = new Schema(
  {
    // Feature flags for different UI components/pages
    questionsPageEnabled: {
      type: Boolean,
      default: true, // Default to enabled
    },

    // Names of up to 4 featured entrance exams to show in marketing copy
    // e.g. ["JEE", "NEET", "CET", "CUET"]
    featuredExamNames: {
      type: [String],
      default: ["JEE", "NEET", "CET", "CUET"],
    },

    // Add more feature flags here as needed
    // uploadPdfPageEnabled: { type: Boolean, default: true },
    // dashboardEnabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Ensure only one document exists (singleton pattern)
uiFlagsSchema.statics.getFlags = async function () {
  let flags = await this.findOne();
  if (!flags) {
    flags = await this.create({});
  }
  return flags;
};

export const UIFlags = model("UIFlags", uiFlagsSchema);
