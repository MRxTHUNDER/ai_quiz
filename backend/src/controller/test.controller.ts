import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { QuestionModel } from "../models/questions.model";
import { testModel, TestModel } from "../models/test.model";
import { success } from "zod";

export const CreateTest = async (req: Request, res: Response) => {
  try {
    const { entranceExamId, subjectId, testSubject } = req.body;

    // Support both old format (testSubject name) and new format (entranceExamId + subjectId)
    let subjectExists;
    let entranceExam;
    let totalQuestionsToUse: number;
    let durationMinutesToUse: number;

    if (entranceExamId && subjectId) {
      // New format: Use entrance exam configuration
      entranceExam = await EntranceExam.findById(entranceExamId);
      if (!entranceExam) {
        res.status(404).json({
          message: "Entrance exam not found",
        });
        return;
      }

      subjectExists = await Subject.findById(subjectId);
      if (!subjectExists) {
        res.status(404).json({
          message: "Subject not found",
        });
        return;
      }

      // Find the subject configuration in the entrance exam
      const subjectConfig = entranceExam.subjects.find(
        (sub: any) => sub.subject.toString() === subjectId
      );

      if (!subjectConfig) {
        res.status(400).json({
          message: "Subject is not part of this entrance exam",
        });
        return;
      }

      totalQuestionsToUse = subjectConfig.totalQuestions || 50;
      durationMinutesToUse = subjectConfig.durationMinutes;
    } else if (testSubject) {
      // Old format: Legacy support (subject name only)
      subjectExists = await Subject.findOne({
        subjectName: testSubject,
      });

      if (!subjectExists) {
        res.status(400).json({
          message: "Subject does not exist",
        });
        return;
      }

      // For old format, use default or count from questions
      const totalQuestionsInDb = await QuestionModel.countDocuments({
        SubjectId: subjectExists._id,
      });

      totalQuestionsToUse = totalQuestionsInDb || 50;
      durationMinutesToUse = subjectExists.testDuration;
    } else {
      res.status(400).json({
        message: "Either (entranceExamId + subjectId) or testSubject is required",
      });
      return;
    }

    // Check if we have enough questions in the database
    const availableQuestionsCount = await QuestionModel.countDocuments({
      SubjectId: subjectExists._id,
    });

    if (availableQuestionsCount < totalQuestionsToUse) {
      res.status(400).json({
        message: `Not enough questions present. Required: ${totalQuestionsToUse}, Available: ${availableQuestionsCount}`,
      });
      return;
    }

    // Get all questions from the subject (for proper randomization)
    const allQuestions = await QuestionModel.find({
      SubjectId: subjectExists._id,
    })
      .select("_id");

    // Shuffle all questions to ensure randomness (Fisher-Yates algorithm)
    const shuffledQuestions = [...allQuestions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestions[i], shuffledQuestions[j]] = [
        shuffledQuestions[j],
        shuffledQuestions[i],
      ];
    }

    // Take only the required number based on entrance exam configuration
    const selectedQuestions = shuffledQuestions.slice(0, totalQuestionsToUse);

    // Create test - entranceExamId is required, so we need to handle legacy case
    if (!entranceExam) {
      res.status(400).json({
        message: "entranceExamId is required. Please provide entranceExamId and subjectId when creating a test.",
      });
      return;
    }

    const newTest = await TestModel.create({
      entranceExamId: entranceExam._id,
      testSubject: subjectExists._id,
      questions: selectedQuestions.map((q) => q._id),
      totalQuestions: totalQuestionsToUse,
      durationMinutes: durationMinutesToUse,
    });

    res.status(201).json({
      message: "Test created successfully",
      test: {
        id: newTest._id,
        entranceExamId: entranceExam?._id?.toString() || null,
        subject: subjectExists.subjectName,
        totalQuestions: totalQuestionsToUse,
        durationMinutes: durationMinutesToUse,
        questions: selectedQuestions.map((q) => q._id),
      },
    });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const GetAllTest = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const totalCount = await TestModel.countDocuments();

    const tests = await TestModel.find()
      .populate("testSubject", "subjectName testDuration")
      .select("_id testSubject questions createdAt updatedAt")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedTest = tests.map((test) => ({
      id: test._id.toString(),
      subject: (test.testSubject as any)?.subjectName,
      testDuration: (test.testSubject as any)?.testDuration,
      totalQuestions: test.questions.length,
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
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
      count: tests.length,
      data: formattedTest,
    });
    return;
  } catch (error) {
    console.error("Error Retrieving test:", error);
    res.status(500).json({
      message: "Error Retrieving test",
    });
  }
};

export const GetTest = async (req: Request, res: Response) => {
  try {
    const { id } = req.query;

    if (!id) {
      res.status(400).json({
        success: false,
        message: "Test id is required",
      });
      return;
    }

    const test = await TestModel.findById(id)
      .populate("testSubject", "subjectName testDuration")
      .populate({
        path: "questions",
        select: "questionsText Options",
      });

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found",
      });
      return;
    }

    const formattedTest = {
      id: test._id.toString(),
      subject: (test.testSubject as any)?.subjectName || null,
      testDuration: (test.testSubject as any)?.testDuration || null,
      totalQuestions: test.questions.length,
      questions: test.questions.map((question: any) => ({
        id: question._id.toString(),
        questionsText: question.questionsText,
        Options: question.Options,
      })),
      createdAt: test.createdAt,
      updatedAt: test.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: formattedTest,
    });
  } catch (error) {
    console.error("Error retrieving test:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving test",
    });
  }
};
