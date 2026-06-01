import { model, Schema } from "mongoose";

const questionModel = new Schema(
  {
    questionsText: {
      type: String,
    },

    Options: [
      {
        type: String,
      },
    ],

    correctOption: {
      type: String,
    },

    SubjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
    },

    entranceExam: {
      type: Schema.Types.ObjectId,
      ref: "EntranceExam",
    },

    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
    },

    chapterName: {
      type: String,
      trim: true,
    },

    chapterNickname: {
      type: String,
      trim: true,
    },

    embedding: {
      type: [Number],
      default: undefined,
    },

    topics: {
      type: [String],
      default: [],
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },

  { timestamps: true },
);

questionModel.index({ SubjectId: 1 }); // Find questions by subject
questionModel.index({ createdAt: -1 }); // Get newest questions first
questionModel.index({ SubjectId: 1, topics: 1 }); // Find questions by subject and topics
questionModel.index({ createdBy: 1 }); // Find questions by creator
questionModel.index({ entranceExam: 1 }); // Find questions by entrance exam
questionModel.index({ chapterId: 1 }); // Find questions by chapter

export const QuestionModel = model("Questions", questionModel);
