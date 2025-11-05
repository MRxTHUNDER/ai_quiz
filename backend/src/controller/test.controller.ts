import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { QuestionModel } from "../models/questions.model";
import { testModel, TestModel } from "../models/test.model";
import { success } from "zod";

export const CreateTest = async (req: Request, res: Response) => {
  try {
    const { testSubject, questions } = req.body;

    if (!testSubject || isNaN(Number(questions))) {
      res.status(404).json({
        message: "testSubject or questions is missing",
      });
      return;
    }

    const subjectExists = await Subject.findOne({
      subjectName: testSubject,
    });

    if (!subjectExists) {
      res.status(400).json({
        message: "Subject does not exist",
      });
      return;
    }

    const totalQuestions = await QuestionModel.countDocuments({
      SubjectId: subjectExists._id,
    });

    if (totalQuestions < questions) {
      res.status(400).json({
        message: "Not enough questions present to make a test",
      });
      return;
    }

    const selectedQuestions = await QuestionModel.find({
      SubjectId: subjectExists._id,
    })
      .limit(questions)
      .select("_id");

    const newTest = await TestModel.create({
      testSubject: subjectExists._id,
      questions: selectedQuestions.map((q) => q._id),
    });

    res.status(201).json({
      message: "Test created successfully",
      test: {
        id: newTest._id,
        subject: subjectExists.subjectName,
        totalQuestions: selectedQuestions.length,
        questions: selectedQuestions.map((q) => q._id),
      },
    });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({
      message: "Internal server error",
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
        select: "questionText Options -correctOption",
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
