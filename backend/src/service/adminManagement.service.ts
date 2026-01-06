import { User } from "../models/user.model";
import { UserResult } from "../models/userResult.model";
import { TestModel } from "../models/test.model";
import { UserRole, TestStatus } from "../types/types";
import mongoose from "mongoose";

/**
 * Get all users with pagination and filtering
 * By default, excludes admin users - only returns users with role "user"
 */
export const getAllUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: string,
  entranceExamId?: string,
  startDate?: string,
  endDate?: string
) => {
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};

  // If role is specified and not "all", filter by that role
  // Otherwise, default to only showing users (exclude admins)
  if (role && role !== "all") {
    filter.role = role;
  } else {
    // Default: only return users with role "user" (exclude admins)
    filter.role = UserRole.USER;
  }

  // Add search filter if provided (name or email)
  if (search) {
    filter.$or = [
      { email: { $regex: search, $options: "i" } },
      { firstname: { $regex: search, $options: "i" } },
      { lastname: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by entrance exam preference if provided
  if (entranceExamId && mongoose.Types.ObjectId.isValid(entranceExamId)) {
    filter.entranceExamPreference = new mongoose.Types.ObjectId(entranceExamId);
  }

  // Filter by date range if provided
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter.createdAt.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const totalCount = await User.countDocuments(filter);

  const users = await User.find(filter)
    .select("-password")
    .populate({
      path: "entranceExamPreference",
      select: "entranceExamName entranceExamId",
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    users,
    pagination: {
      currentPage: page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get user details with statistics
 */
export const getUserDetails = async (userId: string) => {
  const user = await User.findById(userId).select("-password").populate({
    path: "entranceExamPreference",
    select: "entranceExamName entranceExamId",
  });
  if (!user) {
    return null;
  }

  // Get user statistics
  const totalAttempts = await UserResult.countDocuments({ userId });
  const completedAttempts = await UserResult.countDocuments({
    userId,
    status: { $in: [TestStatus.COMPLETED, TestStatus.TIME_UP] },
  });
  const inProgressAttempts = await UserResult.countDocuments({
    userId,
    status: TestStatus.IN_PROGRESS,
  });
  const abandonedAttempts = await UserResult.countDocuments({
    userId,
    status: TestStatus.ABANDONED,
  });

  // Get average score
  const completedResults = await UserResult.find({
    userId,
    status: { $in: [TestStatus.COMPLETED, TestStatus.TIME_UP] },
  });

  const scores = completedResults.map((r) => r.score || 0);
  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
        100
      : 0;

  const percentages = completedResults.map((r) => {
    if (r.totalQuestions > 0) {
      return Math.round((r.correctCount / r.totalQuestions) * 100 * 100) / 100;
    }
    return 0;
  });

  const averagePercentage =
    percentages.length > 0
      ? Math.round(
          (percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100
        ) / 100
      : 0;

  return {
    user,
    statistics: {
      totalAttempts,
      completedAttempts,
      inProgressAttempts,
      abandonedAttempts,
      averageScore,
      averagePercentage,
    },
  };
};

/**
 * Update user details
 */
export const updateUser = async (
  userId: string,
  updateData: {
    email?: string;
    firstname?: string;
    lastname?: string;
    role?: UserRole;
  }
) => {
  // Check if email is being changed and if it conflicts
  if (updateData.email) {
    const existingUser = await User.findOne({
      email: updateData.email,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new Error("Email already exists");
    }
  }

  const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    select: "-password",
  });

  return updatedUser;
};

/**
 * Delete user and all their data
 */
export const deleteUser = async (userId: string) => {
  // Delete all user results
  await UserResult.deleteMany({ userId });

  // Delete user
  const deletedUser = await User.findByIdAndDelete(userId);
  return deletedUser;
};

/**
 * Get all test attempts with filtering and pagination
 */
export const getAllTestAttempts = async (
  page: number = 1,
  limit: number = 10,
  filters?: {
    userId?: string;
    testId?: string;
    entranceExamId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }
) => {
  const skip = (page - 1) * limit;

  // Build filter
  const filter: any = {};
  if (filters?.userId) {
    filter.userId = filters.userId;
  }
  if (filters?.testId) {
    filter.testId = filters.testId;
  }
  if (filters?.entranceExamId) {
    filter.entranceExamId = filters.entranceExamId;
  }
  if (filters?.status && filters.status !== "all") {
    filter.status = filters.status;
  }
  if (filters?.startDate || filters?.endDate) {
    filter.createdAt = {};
    if (filters.startDate) {
      filter.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      filter.createdAt.$lte = filters.endDate;
    }
  }

  const totalCount = await UserResult.countDocuments(filter);

  const attempts = await UserResult.find(filter)
    .populate({
      path: "userId",
      select: "email firstname lastname",
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
    })
    .skip(skip)
    .limit(limit)
    .sort({ createdAt: -1 });

  const formattedAttempts = attempts.map((attempt) => {
    const test = attempt.testId as any;
    const percentage =
      attempt.totalQuestions > 0
        ? Math.round(
            (attempt.correctCount / attempt.totalQuestions) * 100 * 100
          ) / 100
        : 0;

    return {
      attemptId: attempt._id.toString(),
      user: {
        id: (attempt.userId as any)?._id?.toString() || null,
        email: (attempt.userId as any)?.email || null,
        name: `${(attempt.userId as any)?.firstname || ""} ${
          (attempt.userId as any)?.lastname || ""
        }`.trim(),
      },
      test: {
        id: test?._id?.toString() || null,
        subject: (test?.testSubject as any)?.subjectName || null,
        entranceExam: (test?.entranceExamId as any)?.entranceExamName || null,
        entranceExamId: (test?.entranceExamId as any)?.entranceExamId || null,
      },
      score: attempt.score || 0,
      totalQuestions: attempt.totalQuestions,
      attemptedCount: attempt.attemptedCount || 0,
      correctCount: attempt.correctCount || 0,
      percentage: percentage,
      status: attempt.status,
      startTime: attempt.startTime,
      endTime: attempt.endTime,
      timeTaken: attempt.timeTaken || 0,
      createdAt: attempt.createdAt,
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return {
    attempts: formattedAttempts,
    pagination: {
      currentPage: page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

/**
 * Get test attempt details
 */
export const getTestAttemptDetails = async (attemptId: string) => {
  const attempt = await UserResult.findById(attemptId)
    .populate({
      path: "userId",
      select: "email firstname lastname role",
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
        {
          path: "questions",
          select: "questionsText Options correctOption",
        },
      ],
    })
    .populate({
      path: "entranceExamId",
      select: "entranceExamName entranceExamId",
    });

  if (!attempt) {
    return null;
  }

  const test = attempt.testId as any;
  const questions = test?.questions || [];

  // Create question map
  const questionsMap = new Map();
  questions.forEach((question: any) => {
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

  const percentage =
    attempt.totalQuestions > 0
      ? Math.round(
          (attempt.correctCount / attempt.totalQuestions) * 100 * 100
        ) / 100
      : 0;

  return {
    attemptId: attempt._id.toString(),
    user: {
      id: (attempt.userId as any)?._id?.toString() || null,
      email: (attempt.userId as any)?.email || null,
      name: `${(attempt.userId as any)?.firstname || ""} ${
        (attempt.userId as any)?.lastname || ""
      }`.trim(),
      role: (attempt.userId as any)?.role || null,
    },
    test: {
      id: test?._id?.toString() || null,
      subject: (test?.testSubject as any)?.subjectName || null,
      entranceExam: (test?.entranceExamId as any)?.entranceExamName || null,
      entranceExamId: (test?.entranceExamId as any)?.entranceExamId || null,
      totalQuestions: test?.totalQuestions || 0,
      durationMinutes: test?.durationMinutes || 0,
    },
    score: attempt.score || 0,
    totalQuestions: attempt.totalQuestions,
    attemptedCount: attempt.attemptedCount || 0,
    correctCount: attempt.correctCount || 0,
    incorrectCount: attempt.attemptedCount - attempt.correctCount,
    unansweredCount: attempt.totalQuestions - attempt.attemptedCount,
    percentage: percentage,
    status: attempt.status,
    startTime: attempt.startTime,
    endTime: attempt.endTime,
    timeTaken: attempt.timeTaken || 0,
    answers: detailedAnswers,
    createdAt: attempt.createdAt,
  };
};

/**
 * Get user progress for admin view
 */
export const getUserProgressForAdmin = async (userId: string) => {
  const user = await User.findById(userId).select("-password").populate({
    path: "entranceExamPreference",
    select: "entranceExamName entranceExamId",
  });
  if (!user) {
    return null;
  }

  // Use the same service as user profile progress
  const { getUserProfileProgress } = await import("./userProfile.service");
  const progress = await getUserProfileProgress(userId);

  return {
    user: {
      id: user._id.toString(),
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname || "",
      phoneNumber: (user as any).phoneNumber || undefined,
      entranceExamPreference: (user as any).entranceExamPreference || undefined,
      role: user.role,
      createdAt: user.createdAt,
    },
    progress,
  };
};

/**
 * Get overall platform statistics
 */
export const getPlatformStatistics = async () => {
  const totalUsers = await User.countDocuments({ role: UserRole.USER });
  const totalAdmins = await User.countDocuments({ role: UserRole.ADMIN });
  const totalTests = await TestModel.countDocuments();
  const totalAttempts = await UserResult.countDocuments();

  const completedAttempts = await UserResult.countDocuments({
    status: { $in: [TestStatus.COMPLETED, TestStatus.TIME_UP] },
  });
  const inProgressAttempts = await UserResult.countDocuments({
    status: TestStatus.IN_PROGRESS,
  });
  const abandonedAttempts = await UserResult.countDocuments({
    status: TestStatus.ABANDONED,
  });

  // Get average scores
  const completedResults = await UserResult.find({
    status: { $in: [TestStatus.COMPLETED, TestStatus.TIME_UP] },
  });

  const scores = completedResults.map((r) => r.score || 0);
  const averageScore =
    scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) /
        100
      : 0;

  const percentages = completedResults.map((r) => {
    if (r.totalQuestions > 0) {
      return Math.round((r.correctCount / r.totalQuestions) * 100 * 100) / 100;
    }
    return 0;
  });

  const averagePercentage =
    percentages.length > 0
      ? Math.round(
          (percentages.reduce((a, b) => a + b, 0) / percentages.length) * 100
        ) / 100
      : 0;

  // Get recent activity (last 24 hours)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAttempts = await UserResult.countDocuments({
    createdAt: { $gte: oneDayAgo },
  });

  return {
    totalUsers,
    totalAdmins,
    totalTests,
    totalAttempts,
    completedAttempts,
    inProgressAttempts,
    abandonedAttempts,
    averageScore,
    averagePercentage,
    recentAttempts,
  };
};
