import { model, Schema } from "mongoose";

const summarySchema = new Schema(
  {
    summaryText: {
      type: String,
      required: true,
    },
    topics: {
      type: [String],
      required: true,
      index: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    entranceExam: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
      index: true,
    },
    sourcePdfs: [
      {
        type: Schema.Types.ObjectId,
        ref: "Pdf",
      },
    ],
    // Embedding for semantic similarity matching (optional, for advanced matching)
    embedding: {
      type: [Number],
      default: undefined,
    },
  },
  { timestamps: true }
);

// Compound index for efficient subject + topic queries
summarySchema.index({ subject: 1, topics: 1 });
summarySchema.index({ subject: 1, entranceExam: 1 });

export const Summary = model("Summary", summarySchema);
