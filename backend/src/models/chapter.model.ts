import { model, Schema } from "mongoose";

const chapterSchema = new Schema(
  {
    entranceExam: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
      required: true,
      index: true,
    },
    subject: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
      index: true,
    },
    chapterName: {
      type: String,
      required: true,
      trim: true,
    },
    chapterSlug: {
      type: String,
      required: true,
      trim: true,
    },
    nickname: {
      type: String,
      required: false,
      trim: true,
      default: null,
    },
    totalQuestionsGenerated: {
      type: Number,
      required: true,
      default: 0,
    },
    totalPdfUploads: {
      type: Number,
      required: true,
      default: 0,
    },
    lastGeneratedAt: {
      type: Date,
      required: false,
      default: null,
    },
    lastUploadedAt: {
      type: Date,
      required: false,
      default: null,
    },
  },
  { timestamps: true },
);

chapterSchema.index(
  { entranceExam: 1, subject: 1, chapterSlug: 1 },
  { unique: true },
);

chapterSchema.index({ chapterName: 1 });
chapterSchema.index({ updatedAt: -1 });

export const Chapter = model("Chapter", chapterSchema);
