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
  },

  { timestamps: true },
);

questionModel.index({ SubjectId: 1 }); // Find questions by subject
questionModel.index({ createdAt: -1 }); // Get newest questions first

export const QuestionModel = model("Questions", questionModel);
