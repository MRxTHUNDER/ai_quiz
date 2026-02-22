import { Request, Response } from "express";
import { EntranceExam } from "../models/entranceExam.model";
import { TestModel } from "../models/test.model";
import { QuestionModel } from "../models/questions.model";
import { UserResult } from "../models/userResult.model";
import { TestStatus } from "../types/types";
import mongoose from "mongoose";

/**
 * Helper function to get all question IDs that a user has already answered
 * for a specific entrance exam and subject combination
 * @param userId - User ID
 * @param entranceExamId - Entrance exam ID
 * @param subjectId - Subject ID
 * @returns Set of question IDs (as strings) that user has already answered
 */
async function getAnsweredQuestionIds(
  userId: string,
  entranceExamId: string,
  subjectId: string,
): Promise<Set<string>> {
  // First, find all test IDs for this entrance exam and subject
  const testsForSubject = await TestModel.find({
    entranceExamId: new mongoose.Types.ObjectId(entranceExamId),
    testSubject: new mongoose.Types.ObjectId(subjectId),
  }).select("_id");

  const testIds = testsForSubject.map((test) => test._id);

  if (testIds.length === 0) {
    return new Set<string>();
  }

  // Find all previous attempts for this user, entrance exam, and matching tests
  // We check completed, time_up, and abandoned tests (exclude in_progress)
  const previousAttempts = await UserResult.find({
    userId: new mongoose.Types.ObjectId(userId),
    entranceExamId: new mongoose.Types.ObjectId(entranceExamId),
    testId: { $in: testIds },
    status: {
      $in: [TestStatus.COMPLETED, TestStatus.TIME_UP, TestStatus.ABANDONED],
    },
  }).select("answers");

  // Collect all question IDs from previous attempts
  const answeredQuestionIds = new Set<string>();

  previousAttempts.forEach((attempt: any) => {
    attempt.answers.forEach((answer: any) => {
      answeredQuestionIds.add(answer.questionId.toString());
    });
  });

  return answeredQuestionIds;
}

/**
 * Get subjects available for a specific entrance exam
 * GET /user/entrance-exams/:examId/subjects
 */
export const GetEntranceExamSubjects = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      res.status(400).json({
        success: false,
        message: "Exam ID is required",
      });
      return;
    }

    const exam = await EntranceExam.findById(examId).populate({
      path: "subjects.subject",
      select: "subjectName testDuration",
    });

    if (!exam) {
      res.status(404).json({
        success: false,
        message: "Entrance exam not found",
      });
      return;
    }

    // Get subjects with stored totalQuestions from entrance exam config
    const subjectsWithCounts = exam.subjects.map((sub: any) => {
      const subject = sub.subject;
      return {
        _id: subject._id.toString(),
        subjectName: subject.subjectName,
        testDuration: sub.durationMinutes || subject.testDuration,
        totalQuestions: sub.totalQuestions || 50, // Use stored totalQuestions from entrance exam config
      };
    });

    res.status(200).json({
      success: true,
      exam: {
        _id: exam._id.toString(),
        entranceExamName: exam.entranceExamName,
        entranceExamId: exam.entranceExamId,
      },
      subjects: subjectsWithCounts,
    });
  } catch (error) {
    console.error("Error fetching entrance exam subjects:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching entrance exam subjects",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get available tests with optional filters
 * GET /user/tests?entranceExamId=XXX&subjectId=YYY&page=1&limit=10
 */
export const GetUserTests = async (req: Request, res: Response) => {
  try {
    const { entranceExamId, subjectId } = req.query;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    // Build filter query - convert string IDs to ObjectIds
    const filter: any = {};
    if (entranceExamId) {
      filter.entranceExamId = new mongoose.Types.ObjectId(
        entranceExamId as string,
      );
    }
    if (subjectId) {
      filter.testSubject = new mongoose.Types.ObjectId(subjectId as string);
    }

    const totalCount = await TestModel.countDocuments(filter);

    const tests = await TestModel.find(filter)
      .populate("testSubject", "subjectName testDuration")
      .populate("entranceExamId", "entranceExamName entranceExamId")
      .select(
        "_id entranceExamId testSubject questions totalQuestions durationMinutes createdAt updatedAt",
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedTests = tests.map((test) => {
      // Handle populated vs unpopulated entranceExamId
      const entranceExam = test.entranceExamId as any;
      const entranceExamId =
        entranceExam?._id?.toString() || entranceExam?.toString() || null;

      // Handle populated vs unpopulated testSubject
      const subject = test.testSubject as any;
      const subjectId = subject?._id?.toString() || subject?.toString() || null;

      return {
        id: test._id.toString(),
        entranceExam: {
          _id: entranceExamId,
          name: entranceExam?.entranceExamName || null,
          examId: entranceExam?.entranceExamId || null,
        },
        subject: {
          _id: subjectId,
          name: subject?.subjectName || null,
          testDuration: subject?.testDuration || null,
        },
        totalQuestions: test.totalQuestions,
        durationMinutes: test.durationMinutes,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt,
      };
    });

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
      data: formattedTests,
    });
  } catch (error) {
    console.error("Error retrieving tests:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving tests",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Start a test - creates UserResult with IN_PROGRESS status
 * POST /user/test/start
 * Requires authentication
 */
export const StartTest = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { testId, entranceExamId } = req.body;

    if (!testId || !entranceExamId) {
      res.status(400).json({
        success: false,
        message: "testId and entranceExamId are required",
      });
      return;
    }

    // Check if user already has an IN_PROGRESS test for this testId
    const existingAttempt = await UserResult.findOne({
      userId,
      testId,
      status: TestStatus.IN_PROGRESS,
    });

    if (existingAttempt) {
      // Return existing attempt
      const test = await TestModel.findById(testId)
        .populate("testSubject", "subjectName")
        .populate("entranceExamId", "entranceExamName entranceExamId");

      if (!test) {
        res.status(404).json({
          success: false,
          message: "Test not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Test already in progress",
        data: {
          attemptId: existingAttempt._id.toString(),
          testId: test._id.toString(),
          entranceExam: {
            _id: (test.entranceExamId as any)?._id?.toString(),
            name: (test.entranceExamId as any)?.entranceExamName,
            examId: (test.entranceExamId as any)?.entranceExamId,
          },
          startTime: existingAttempt.startTime,
          durationMinutes: test.durationMinutes,
          totalQuestions: existingAttempt.totalQuestions,
          status: existingAttempt.status,
        },
      });
      return;
    }

    // Get test details with questions
    const test = await TestModel.findById(testId)
      .populate("testSubject", "subjectName _id weeklyLimit")
      .populate(
        "entranceExamId",
        "_id entranceExamName entranceExamId weeklyLimit",
      )
      .populate("questions", "_id");

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found",
      });
      return;
    }

    // Verify entranceExamId matches
    // Handle both populated (object) and unpopulated (ObjectId) cases
    let testEntranceExamId: string;
    const entranceExam = test.entranceExamId as any;
    if (
      entranceExam &&
      typeof entranceExam === "object" &&
      "_id" in entranceExam
    ) {
      // Populated case - entranceExamId is an object with _id
      testEntranceExamId = entranceExam._id.toString();
    } else {
      // Unpopulated case - entranceExamId is an ObjectId
      testEntranceExamId = entranceExam.toString();
    }

    if (testEntranceExamId !== entranceExamId) {
      res.status(400).json({
        success: false,
        message: "Entrance exam ID does not match the test",
        debug: {
          testEntranceExamId,
          providedEntranceExamId: entranceExamId,
          testEntranceExamIdType: typeof test.entranceExamId,
        },
      });
      return;
    }

    const subjectId = (test.testSubject as any)._id.toString();

    // -- Weekly Limits Validation --
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 1. Check Entrance Exam weekly limit
    const examWeeklyLimit = (entranceExam as any).weeklyLimit ?? 7;
    const examAttemptsCount = await UserResult.countDocuments({
      userId,
      entranceExamId: new mongoose.Types.ObjectId(testEntranceExamId),
      createdAt: { $gte: sevenDaysAgo },
    });

    if (examAttemptsCount >= examWeeklyLimit) {
      res.status(403).json({
        success: false,
        message: `Weekly limit of ${examWeeklyLimit} tests reached for this exam.`,
      });
      return;
    }
    // -- End Weekly Limits Validation --

    // Check if user has already answered questions for this entrance exam + subject
    const answeredQuestionIds = await getAnsweredQuestionIds(
      userId,
      entranceExamId,
      subjectId,
    );

    // Get all question IDs in this test
    const testQuestionIds = (test.questions as any[]).map((q: any) =>
      q._id.toString(),
    );

    // Filter out already answered questions
    const availableQuestionIds = testQuestionIds.filter(
      (qId) => !answeredQuestionIds.has(qId),
    );

    // Check if we have enough new questions
    if (availableQuestionIds.length === 0) {
      res.status(400).json({
        success: false,
        message:
          "You have already answered all available questions for this test. Please try a different test or subject.",
        data: {
          answeredQuestionsCount: answeredQuestionIds.size,
          availableQuestionsCount: 0,
          requiredQuestionsCount: test.totalQuestions,
        },
      });
      return;
    }

    // Warn if fewer questions available than required (but still allow)
    if (availableQuestionIds.length < test.totalQuestions) {
      console.warn(
        `User ${userId} starting test with only ${availableQuestionIds.length} new questions ` +
          `(requires ${test.totalQuestions}, already answered ${answeredQuestionIds.size})`,
      );
    }

    // Create new UserResult
    // Use actual available questions count (or required count, whichever is smaller)
    const actualTotalQuestions = Math.min(
      test.totalQuestions,
      availableQuestionIds.length,
    );

    const startTime = new Date();
    const newAttempt = await UserResult.create({
      userId,
      testId,
      entranceExamId,
      startTime,
      totalQuestions: actualTotalQuestions,
      status: TestStatus.IN_PROGRESS,
      answers: [],
      attemptedCount: 0,
      correctCount: 0,
      score: 0,
      timeTaken: 0,
    });

    res.status(200).json({
      success: true,
      message: "Test started successfully",
      data: {
        attemptId: newAttempt._id.toString(),
        testId: test._id.toString(),
        entranceExam: {
          _id: (test.entranceExamId as any)?._id?.toString(),
          name: (test.entranceExamId as any)?.entranceExamName,
          examId: (test.entranceExamId as any)?.entranceExamId,
        },
        startTime: newAttempt.startTime,
        durationMinutes: test.durationMinutes,
        totalQuestions: newAttempt.totalQuestions,
        originalTotalQuestions: test.totalQuestions,
        status: newAttempt.status,
        ...(availableQuestionIds.length < test.totalQuestions && {
          warning: `Only ${availableQuestionIds.length} new questions available (you've already answered ${answeredQuestionIds.size} questions for this test).`,
        }),
      },
    });
  } catch (error) {
    console.error("Error starting test:", error);
    res.status(500).json({
      success: false,
      message: "Error starting test",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get randomized questions for the test (without correct answers)
 * GET /user/test/:testId/questions?attemptId=XXX
 * Requires authentication
 */
export const GetTestQuestions = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { testId } = req.params;
    const { attemptId } = req.query;

    if (!testId) {
      res.status(400).json({
        success: false,
        message: "Test ID is required",
      });
      return;
    }

    if (!attemptId) {
      res.status(400).json({
        success: false,
        message: "Attempt ID is required",
      });
      return;
    }

    // Verify attempt belongs to user
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
      testId,
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    // Check if test is still in progress
    if (attempt.status !== TestStatus.IN_PROGRESS) {
      res.status(400).json({
        success: false,
        message: `Test is already ${attempt.status}. Cannot retrieve questions.`,
      });
      return;
    }

    // Get test with questions and subject info
    const test = await TestModel.findById(testId)
      .populate({
        path: "questions",
        select: "questionsText Options",
      })
      .populate("testSubject", "_id");

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found",
      });
      return;
    }

    // Get all question IDs that user has already answered for this entrance exam + subject
    const answeredQuestionIds = await getAnsweredQuestionIds(
      userId,
      attempt.entranceExamId.toString(),
      (test.testSubject as any)._id.toString(),
    );

    // Filter out questions that user has already answered
    const availableQuestions = (test.questions as any[]).filter(
      (question: any) => !answeredQuestionIds.has(question._id.toString()),
    );

    // Check if we have enough new questions
    if (availableQuestions.length < test.totalQuestions) {
      // If not enough new questions, show what's available
      // You can adjust this logic based on your requirements
      console.warn(
        `User ${userId} has already answered ${answeredQuestionIds.size} questions. ` +
          `Only ${availableQuestions.length} new questions available, but test requires ${test.totalQuestions}.`,
      );

      // Option 1: Return available questions (even if less than required)
      // Option 2: Return error message
      // We'll go with Option 1 but include a warning in response
      if (availableQuestions.length === 0) {
        res.status(400).json({
          success: false,
          message:
            "You have already answered all available questions for this test. Please try a different test or subject.",
          data: {
            answeredQuestionsCount: answeredQuestionIds.size,
            availableQuestionsCount: 0,
            requiredQuestionsCount: test.totalQuestions,
          },
        });
        return;
      }
    }

    // Shuffle available questions array (Fisher-Yates algorithm)
    const shuffledQuestions = [...availableQuestions];
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuestions[i], shuffledQuestions[j]] = [
        shuffledQuestions[j],
        shuffledQuestions[i],
      ];
    }

    // Limit to totalQuestions (or available count if less)
    const questionsToShow = shuffledQuestions.slice(
      0,
      Math.min(test.totalQuestions, availableQuestions.length),
    );

    // Format questions without correct answers
    const formattedQuestions = questionsToShow.map(
      (question: any, index: number) => ({
        id: question._id.toString(),
        questionNumber: index + 1,
        questionsText: question.questionsText,
        Options: question.Options,
      }),
    );

    // Check if we're showing fewer questions than required
    const isLimitedQuestions = questionsToShow.length < test.totalQuestions;

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        questions: formattedQuestions,
        totalQuestions: questionsToShow.length, // Actual questions being shown
        originalTotalQuestions: test.totalQuestions, // Original requirement
        durationMinutes: test.durationMinutes,
        ...(isLimitedQuestions && {
          warning: `Only ${questionsToShow.length} new questions available (you've already answered ${answeredQuestionIds.size} questions for this test).`,
        }),
      },
    });
  } catch (error) {
    console.error("Error retrieving test questions:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test questions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Submit answer for a question (can be called multiple times to change answer)
 * POST /user/test/:attemptId/answer
 * Requires authentication
 */
export const SubmitAnswer = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;
    const { questionId, selectedOption } = req.body;

    if (!questionId || !selectedOption) {
      res.status(400).json({
        success: false,
        message: "questionId and selectedOption are required",
      });
      return;
    }

    // Find UserResult by attemptId and userId (verify ownership)
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    // Check if test is still in progress
    if (attempt.status !== TestStatus.IN_PROGRESS) {
      res.status(400).json({
        success: false,
        message: `Cannot submit answer. Test is already ${attempt.status}.`,
      });
      return;
    }

    // Check if answer already exists
    const existingAnswerIndex = attempt.answers.findIndex(
      (answer: any) => answer.questionId.toString() === questionId,
    );

    if (existingAnswerIndex >= 0) {
      // Update existing answer
      attempt.answers[existingAnswerIndex].selectedOption = selectedOption;
      // Note: isCorrect will be calculated when test ends
    } else {
      // Add new answer
      attempt.answers.push({
        questionId,
        selectedOption,
        isCorrect: false, // Will be calculated when test ends
      });
    }

    // Update attempted count (count of unique questions answered)
    attempt.attemptedCount = attempt.answers.length;

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Answer saved successfully",
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting answer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get current progress (how many answered, time remaining, etc.)
 * GET /user/test/:attemptId/progress
 * Requires authentication
 */
export const GetTestProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;

    // Find UserResult by attemptId and userId (verify ownership)
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    }).populate({
      path: "testId",
      select: "durationMinutes totalQuestions",
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    const test = attempt.testId as any;
    const now = new Date();
    const startTime = new Date(attempt.startTime);
    const elapsedTime = Math.floor(
      (now.getTime() - startTime.getTime()) / 1000,
    ); // seconds
    const totalTime = test.durationMinutes * 60; // Convert to seconds
    const remainingTime = Math.max(0, totalTime - elapsedTime);

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        totalQuestions: attempt.totalQuestions,
        attemptedCount: attempt.answers.length,
        unansweredCount: attempt.totalQuestions - attempt.answers.length,
        startTime: attempt.startTime,
        elapsedTime: elapsedTime,
        remainingTime: remainingTime,
        status: attempt.status,
      },
    });
  } catch (error) {
    console.error("Error retrieving test progress:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test progress",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * End the test - calculate score and update status
 * POST /user/test/:attemptId/end
 * Requires authentication
 */
export const EndTest = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;

    // Find UserResult by attemptId and userId
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    // If status is already COMPLETED, return error
    if (attempt.status === TestStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: "Test has already been completed",
      });
      return;
    }

    // Check if test is in progress
    if (attempt.status !== TestStatus.IN_PROGRESS) {
      res.status(400).json({
        success: false,
        message: `Cannot end test. Test status is ${attempt.status}.`,
      });
      return;
    }

    // Get test with questions to verify answers and entrance exam for marking scheme
    const test = await TestModel.findById(attempt.testId)
      .populate({
        path: "questions",
        select: "_id correctOption",
      })
      .populate({
        path: "entranceExamId",
        select: "markingScheme",
      });

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found",
      });
      return;
    }

    // Get marking scheme from entrance exam (with defaults)
    const entranceExam = test.entranceExamId as any;
    const markingScheme = entranceExam?.markingScheme || {
      correctMarks: 4,
      incorrectMarks: -1,
      unansweredMarks: 0,
    };

    // Create a map of questionId to correctOption for quick lookup
    const correctAnswersMap = new Map();
    (test.questions as any[]).forEach((question: any) => {
      correctAnswersMap.set(question._id.toString(), question.correctOption);
    });

    // Calculate scores for each answer
    let correctCount = 0;
    let incorrectCount = 0;

    attempt.answers.forEach((answer: any) => {
      const correctOption = correctAnswersMap.get(answer.questionId.toString());
      const isCorrect = answer.selectedOption === correctOption;

      answer.isCorrect = isCorrect;

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    // Calculate final metrics with marking scheme
    const attemptedCount = attempt.answers.length;
    const unansweredCount = attempt.totalQuestions - attemptedCount;

    // Apply marking scheme
    const score =
      correctCount * markingScheme.correctMarks +
      incorrectCount * markingScheme.incorrectMarks +
      unansweredCount * markingScheme.unansweredMarks;

    const maxScore = attempt.totalQuestions * markingScheme.correctMarks;
    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;

    // Calculate time taken
    const endTime = new Date();
    const startTime = new Date(attempt.startTime);
    const timeTaken = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    ); // seconds

    // Update UserResult
    attempt.status = TestStatus.COMPLETED;
    attempt.endTime = endTime;
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.attemptedCount = attemptedCount;
    attempt.timeTaken = timeTaken;

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Test completed successfully",
      data: {
        attemptId: attempt._id.toString(),
        status: attempt.status,
        score: score,
        totalQuestions: attempt.totalQuestions,
        attemptedCount: attemptedCount,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unansweredCount: unansweredCount,
        timeTaken: timeTaken,
        percentage: percentage,
      },
    });
  } catch (error) {
    console.error("Error ending test:", error);
    res.status(500).json({
      success: false,
      message: "Error ending test",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Mark test as abandoned (user left without finishing)
 * POST /user/test/:attemptId/abandon
 * Requires authentication
 */
export const AbandonTest = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;

    // Find UserResult by attemptId and userId
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    // Check if test is already completed or abandoned
    if (
      attempt.status === TestStatus.COMPLETED ||
      attempt.status === TestStatus.ABANDONED
    ) {
      res.status(400).json({
        success: false,
        message: `Test is already ${attempt.status}. Cannot abandon.`,
      });
      return;
    }

    // Calculate partial score if any answers exist
    if (attempt.answers.length > 0) {
      const test = await TestModel.findById(attempt.testId)
        .populate({
          path: "questions",
          select: "_id correctOption",
        })
        .populate({
          path: "entranceExamId",
          select: "markingScheme",
        });

      if (test) {
        // Get marking scheme from entrance exam (with defaults)
        const entranceExam = test.entranceExamId as any;
        const markingScheme = entranceExam?.markingScheme || {
          correctMarks: 4,
          incorrectMarks: -1,
          unansweredMarks: 0,
        };

        const correctAnswersMap = new Map();
        (test.questions as any[]).forEach((question: any) => {
          correctAnswersMap.set(
            question._id.toString(),
            question.correctOption,
          );
        });

        let correctCount = 0;
        let incorrectCount = 0;
        attempt.answers.forEach((answer: any) => {
          const correctOption = correctAnswersMap.get(
            answer.questionId.toString(),
          );
          answer.isCorrect = answer.selectedOption === correctOption;
          if (answer.isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
        });

        const unansweredCount = attempt.totalQuestions - attempt.answers.length;

        // Apply marking scheme
        const score =
          correctCount * markingScheme.correctMarks +
          incorrectCount * markingScheme.incorrectMarks +
          unansweredCount * markingScheme.unansweredMarks;

        attempt.correctCount = correctCount;
        attempt.score = score;
      }
    }

    // Update status to ABANDONED
    attempt.status = TestStatus.ABANDONED;
    attempt.endTime = new Date(); // Track when abandoned
    const startTime = new Date(attempt.startTime);
    attempt.timeTaken = Math.floor(
      (attempt.endTime.getTime() - startTime.getTime()) / 1000,
    );

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Test marked as abandoned",
      data: {
        attemptId: attempt._id.toString(),
        status: attempt.status,
      },
    });
  } catch (error) {
    console.error("Error abandoning test:", error);
    res.status(500).json({
      success: false,
      message: "Error abandoning test",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Auto-end test when time expires (called by frontend timer)
 * POST /user/test/:attemptId/time-up
 * Requires authentication
 */
export const TimeUpTest = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;

    // Find UserResult by attemptId and userId
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    // Check if test is already completed
    if (attempt.status === TestStatus.COMPLETED) {
      res.status(400).json({
        success: false,
        message: "Test has already been completed",
      });
      return;
    }

    // Get test with questions and entrance exam for marking scheme
    const test = await TestModel.findById(attempt.testId)
      .populate({
        path: "questions",
        select: "_id correctOption",
      })
      .populate({
        path: "entranceExamId",
        select: "markingScheme",
      });

    if (!test) {
      res.status(404).json({
        success: false,
        message: "Test not found",
      });
      return;
    }

    // Get marking scheme from entrance exam (with defaults)
    const entranceExam = test.entranceExamId as any;
    const markingScheme = entranceExam?.markingScheme || {
      correctMarks: 4,
      incorrectMarks: -1,
      unansweredMarks: 0,
    };

    // Create a map of questionId to correctOption
    const correctAnswersMap = new Map();
    (test.questions as any[]).forEach((question: any) => {
      correctAnswersMap.set(question._id.toString(), question.correctOption);
    });

    // Calculate scores for answered questions
    let correctCount = 0;
    let incorrectCount = 0;

    attempt.answers.forEach((answer: any) => {
      const correctOption = correctAnswersMap.get(answer.questionId.toString());
      const isCorrect = answer.selectedOption === correctOption;
      answer.isCorrect = isCorrect;

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    // Calculate final metrics with marking scheme
    const attemptedCount = attempt.answers.length;
    const unansweredCount = attempt.totalQuestions - attemptedCount;

    // Apply marking scheme
    const score =
      correctCount * markingScheme.correctMarks +
      incorrectCount * markingScheme.incorrectMarks +
      unansweredCount * markingScheme.unansweredMarks;

    const maxScore = attempt.totalQuestions * markingScheme.correctMarks;
    const percentage =
      maxScore > 0 ? Math.round((score / maxScore) * 100 * 100) / 100 : 0;

    // Calculate time taken
    const endTime = new Date();
    const startTime = new Date(attempt.startTime);
    const timeTaken = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

    // Update UserResult
    attempt.status = TestStatus.TIME_UP;
    attempt.endTime = endTime;
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.attemptedCount = attemptedCount;
    attempt.timeTaken = timeTaken;

    await attempt.save();

    res.status(200).json({
      success: true,
      message: "Test ended due to time limit",
      data: {
        attemptId: attempt._id.toString(),
        status: attempt.status,
        score: score,
        totalQuestions: attempt.totalQuestions,
        attemptedCount: attemptedCount,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unansweredCount: unansweredCount,
        timeTaken: timeTaken,
        percentage: percentage,
      },
    });
  } catch (error) {
    console.error("Error ending test due to time up:", error);
    res.status(500).json({
      success: false,
      message: "Error ending test",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get detailed result after test completion
 * GET /user/test/:attemptId/result
 * Requires authentication
 */
export const GetTestResult = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { attemptId } = req.params;

    // Find UserResult by attemptId and userId
    const attempt = await UserResult.findOne({
      _id: attemptId,
      userId,
    })
      .populate({
        path: "testId",
        populate: [
          {
            path: "testSubject",
            select: "subjectName",
          },
          {
            path: "entranceExamId",
            select: "entranceExamName entranceExamId",
          },
        ],
      })
      .populate({
        path: "entranceExamId",
        select: "entranceExamName entranceExamId",
      });

    if (!attempt) {
      res.status(404).json({
        success: false,
        message: "Test attempt not found or access denied",
      });
      return;
    }

    const test = attempt.testId as any;

    // Get all questions with their details
    const testQuestions = await TestModel.findById(attempt.testId).populate({
      path: "questions",
      select: "questionsText Options correctOption",
    });

    if (!testQuestions) {
      res.status(404).json({
        success: false,
        message: "Test questions not found",
      });
      return;
    }

    // Create a map of questionId to question details
    const questionsMap = new Map();
    (testQuestions.questions as any[]).forEach((question: any) => {
      questionsMap.set(question._id.toString(), {
        id: question._id.toString(),
        questionsText: question.questionsText,
        Options: question.Options,
        correctOption: question.correctOption,
      });
    });

    // Map answers with question details
    const detailedAnswers = attempt.answers.map((answer: any) => {
      const question = questionsMap.get(answer.questionId.toString());
      return {
        questionId: answer.questionId.toString(),
        questionText: question?.questionsText || "Question not found",
        Options: question?.Options || [],
        selectedOption: answer.selectedOption,
        correctOption: question?.correctOption || "",
        isCorrect: answer.isCorrect,
      };
    });

    // Calculate metrics
    const attemptedCount = attempt.answers.length;
    const correctCount = attempt.correctCount || 0;
    const incorrectCount = attemptedCount - correctCount;
    const unansweredCount = attempt.totalQuestions - attemptedCount;
    // Calculate percentage: (correctCount / totalQuestions) * 100, rounded to 2 decimal places
    const percentage =
      attempt.totalQuestions > 0
        ? Math.round((correctCount / attempt.totalQuestions) * 100 * 100) / 100
        : 0;

    res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id.toString(),
        test: {
          subject: (test.testSubject as any)?.subjectName || null,
          entranceExam: (test.entranceExamId as any)?.entranceExamName || null,
          entranceExamId: (test.entranceExamId as any)?.entranceExamId || null,
        },
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        attemptedCount: attemptedCount,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        unansweredCount: unansweredCount,
        percentage: percentage,
        timeTaken: attempt.timeTaken,
        status: attempt.status,
        startTime: attempt.startTime,
        endTime: attempt.endTime,
        answers: detailedAnswers,
      },
    });
  } catch (error) {
    console.error("Error retrieving test result:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test result",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all test attempts by user
 * GET /user/test-history?status=completed&page=1&limit=10
 * Requires authentication
 */
export const GetTestHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!; // From AuthMiddleware
    const { status, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(
      1,
      Math.min(100, parseInt(limit as string) || 10),
    );
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter: any = { userId };
    if (status) {
      filter.status = status;
    }

    const totalCount = await UserResult.countDocuments(filter);

    const attempts = await UserResult.find(filter)
      .populate({
        path: "testId",
        populate: [
          {
            path: "testSubject",
            select: "subjectName",
          },
          {
            path: "entranceExamId",
            select: "entranceExamName entranceExamId",
          },
        ],
      })
      .select(
        "_id testId entranceExamId score totalQuestions correctCount status createdAt endTime",
      )
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const formattedAttempts = attempts.map((attempt) => {
      const test = attempt.testId as any;
      const percentage =
        attempt.totalQuestions > 0
          ? Math.round(
              (attempt.correctCount / attempt.totalQuestions) * 100 * 100,
            ) / 100
          : 0;

      return {
        attemptId: attempt._id.toString(),
        test: {
          subject: (test?.testSubject as any)?.subjectName || null,
          entranceExam: (test?.entranceExamId as any)?.entranceExamName || null,
          entranceExamId: (test?.entranceExamId as any)?.entranceExamId || null,
        },
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctCount: attempt.correctCount,
        percentage: percentage,
        status: attempt.status,
        completedAt: attempt.endTime || attempt.createdAt,
      };
    });

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: pageNum,
        limit: limitNum,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      count: attempts.length,
      data: formattedAttempts,
    });
  } catch (error) {
    console.error("Error retrieving test history:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
