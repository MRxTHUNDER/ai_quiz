import { model, Schema } from "mongoose";

const pdfSchema = new Schema(
  {
    fileName: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    key: {
      type: String,
      required: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    entranceExam: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    extractedText: {
      type: String,
    },
  },
  { timestamps: true }
);

pdfSchema.index({ uploadedBy: 1 });
pdfSchema.index({ subject: 1 });
pdfSchema.index({ entranceExam: 1 });
pdfSchema.index({ createdAt: -1 });

export const Pdf = model("Pdf", pdfSchema);

