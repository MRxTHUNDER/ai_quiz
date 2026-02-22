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

    // Controls whether this exam is visible/usable in the user-facing UI
    isEnabled: {
      type: Boolean,
      default: true,
    },

    // Display order for sorting exams (lower number = appears first)
    displayOrder: {
      type: Number,
      default: 0,
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

        // Optional per-exam subject visibility flag
        isEnabled: {
          type: Boolean,
          default: true,
        },
      },
    ],

    notes: {
      type: String,
    },

    bannerImageUrl: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    bannerSubjects: {
      type: [String],
      default: [],
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

    // Maximum number of times a user can attempt this exam per week
    weeklyLimit: {
      type: Number,
      default: 7,
    },
  },
  { timestamps: true },
);

// entranceExamName and entranceExamId already have indexes from unique: true
entranceExam.index({ createdAt: -1 }); // Get newest exams first
entranceExam.index({ displayOrder: 1 }); // Sort by display order

export const EntranceExam = model("EntranceExam", entranceExam);
