import { model, Schema } from "mongoose";

const entranceExam = new Schema(
  {
    entranceExamName: {
      type: String,
      required: true,
      unique: true,
    },

    entranceExamId: {
      type: String,
      required: true,
      unique: true,
    },

    durationMinutes: {
      type: Number,
      required: true,
    },

    subjects: [
      {
        subject: {
          type: Schema.Types.ObjectId,
          ref: "Subject",
          required: true,
        },
        durationMinutes: {
          type: Number,
          required: true,
        },
      },
    ],

    notes: {
      type: String,
    },
  },
  { timestamps: true },
);

// entranceExamName and entranceExamId already have indexes from unique: true
entranceExam.index({ createdAt: -1 }); // Get newest exams first

export const EntranceExam = model("EntranceExam", entranceExam);
