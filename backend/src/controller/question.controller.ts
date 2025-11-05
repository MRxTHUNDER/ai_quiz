import { Request, Response } from "express";
import { GenerateAIQuestions } from "../service/generateQuestion";
import { QuestionModel } from "../models/questions.model";

interface Questions {
  questionsText: string;
  Options: string[];
  correctOption: string;
  SubjectId: string;
}

export const CreateQuestions = async (req: Request, res: Response) => {
  try {
    const { fileUrl, subjectId } = req.body;

    if (!fileUrl || !subjectId) {
      res.status(400).json({
        message: "fileUrl and subjectId required",
      });
      return;
    }

    const generatedQuestions: Questions[] = await GenerateAIQuestions(fileUrl);

    const formattedQuestions = generatedQuestions.map((q: Questions) => ({
      questionsText: q.questionsText,
      Options: q.Options,
      correctOption: q.correctOption,
      SubjectId: subjectId,
    }));

    const savedQuestions = await QuestionModel.insertMany(formattedQuestions);

    res.status(201).json({
      message: "Questions generated and saved successfully",
      questions: savedQuestions,
    });
    return;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to generate questions",
    });
  }
};

export const GetSubjectQuestions = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      res.status(400).json({
        success: false,
        message: "SubjectId is required",
      });
      return;
    }

    const subjectExists = await QuestionModel.findById(subjectId);

    if (!subjectExists) {
      res.status(400).json({
        success: false,
        message: "Subject not found",
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 10),
    );
    const skip = (page - 1) * limit;

    const totalCount = await QuestionModel.countDocuments({
      SubjectId: subjectId,
    });

    const questions = await QuestionModel.find({
      SubjectId: subjectId,
    })
      .select("questionsText Options correctOption")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedQuestions = questions.map((question) => ({
      id: question._id.toString(),
      questionsText: question.questionsText,
      Options: question.Options,
      correctOption: question.correctOption, // Remove this for user-facing endpoints!
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      count: formattedQuestions.length,
      data: formattedQuestions,
    });
  } catch (error) {
    console.error("Error retrieving questions:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving questions",
    });
  }
};
