import { model, Schema } from "mongoose";

const userPdfUploadSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pdfId: {
      type: Schema.Types.ObjectId,
      ref: "Pdf",
      required: false, // Optional - for direct generation without PDF
    },
    uploadedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    questionsGenerated: {
      type: Number,
      default: 0,
    },
    backgroundJobId: {
      type: String,
      required: false,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for efficient quota checks - find most recent upload by user
userPdfUploadSchema.index({ userId: 1, uploadedAt: -1 });

export const UserPdfUpload = model("UserPdfUpload", userPdfUploadSchema);
