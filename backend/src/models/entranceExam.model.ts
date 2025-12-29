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
        totalQuestions: {
          type: Number,
          required: true,
          default: 50, // Default to 50 questions if not specified
        },
      },
    ],

    notes: {
      type: String,
    },

    markingScheme: {
      correctMarks: {
        type: Number,
        default: 4,
      },
      incorrectMarks: {
        type: Number,
        default: -1, // Negative value for penalty
      },
      unansweredMarks: {
        type: Number,
        default: 0,
      },
    },
  },
  { timestamps: true }
);

// entranceExamName and entranceExamId already have indexes from unique: true
entranceExam.index({ createdAt: -1 }); // Get newest exams first

export const EntranceExam = model("EntranceExam", entranceExam);
