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

    embedding: {
      type: [Number],
      default: undefined,
    },

    topics: {
      type: [String],
      default: [],
    },
  },

  { timestamps: true },
);

questionModel.index({ SubjectId: 1 }); // Find questions by subject
questionModel.index({ createdAt: -1 }); // Get newest questions first
questionModel.index({ SubjectId: 1, topics: 1 }); // Find questions by subject and topics

export const QuestionModel = model("Questions", questionModel);
