import { UserResult } from "../models/userResult.model";
import { TestStatus } from "../types/types";

/**
 * Calculate percentage from correct count and total questions
 */
const calculatePercentage = (
  correctCount: number,
  totalQuestions: number
): number => {
  if (totalQuestions > 0) {
    return (
      Math.round((correctCount / totalQuestions) * 100 * 100) / 100
    );
  }
  return 0;
};

/**
 * Calculate average from array of numbers
 */
const calculateAverage = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return (
    Math.round(
      (numbers.reduce((a, b) => a + b, 0) / numbers.length) * 100
    ) / 100
  );
};

/**
 * Get user profile progress data
 */
export const getUserProfileProgress = async (userId: string) => {
  // Get all test results for the user
  const allResults = await UserResult.find({ userId })
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
    .sort({ createdAt: -1 });

  // Calculate basic statistics
  const totalTests = allResults.length;
  const completedTests = allResults.filter(
    (r) =>
      r.status === TestStatus.COMPLETED || r.status === TestStatus.TIME_UP
  );
  const inProgressTests = allResults.filter(
    (r) => r.status === TestStatus.IN_PROGRESS
  );
  const abandonedTests = allResults.filter(
    (r) => r.status === TestStatus.ABANDONED
  );

  // Calculate scores and percentages
  const completedResults = allResults.filter(
    (r) =>
      r.status === TestStatus.COMPLETED || r.status === TestStatus.TIME_UP
  );

  const scores = completedResults.map((r) => r.score || 0);
  const percentages = completedResults.map((r) =>
    calculatePercentage(r.correctCount || 0, r.totalQuestions)
  );

  const averageScore = calculateAverage(scores);
  const averagePercentage = calculateAverage(percentages);

  const bestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const bestPercentage = percentages.length > 0 ? Math.max(...percentages) : 0;

  // Calculate total questions answered and correct
  const totalQuestionsAnswered = allResults.reduce(
    (sum, r) => sum + (r.attemptedCount || 0),
    0
  );
  const totalCorrectAnswers = allResults.reduce(
    (sum, r) => sum + (r.correctCount || 0),
    0
  );
  const overallAccuracy =
    totalQuestionsAnswered > 0
      ? calculatePercentage(totalCorrectAnswers, totalQuestionsAnswered)
      : 0;

  // Calculate total time spent
  const totalTimeSpent = allResults.reduce(
    (sum, r) => sum + (r.timeTaken || 0),
    0
  );

  // Group by subject
  const subjectMap = new Map();
  allResults.forEach((result) => {
    const test = result.testId as any;
    const subject = test?.testSubject;
    if (subject) {
      const subjectId = subject._id.toString();
      const subjectName = subject.subjectName;

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: subjectName,
          subjectId: subjectId,
          testCount: 0,
          scores: [],
          percentages: [],
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.testCount++;

      if (
        result.status === TestStatus.COMPLETED ||
        result.status === TestStatus.TIME_UP
      ) {
        subjectData.scores.push(result.score || 0);
        const percentage = calculatePercentage(
          result.correctCount || 0,
          result.totalQuestions
        );
        subjectData.percentages.push(percentage);
      }
    }
  });

  const testsBySubject = Array.from(subjectMap.values()).map((data) => ({
    subject: data.subject,
    subjectId: data.subjectId,
    testCount: data.testCount,
    averageScore: calculateAverage(data.scores),
    averagePercentage: calculateAverage(data.percentages),
    bestScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
  }));

  // Group by exam
  const examMap = new Map();
  allResults.forEach((result) => {
    const exam = result.entranceExamId as any;
    if (exam) {
      const examId = exam._id.toString();
      const examName = exam.entranceExamName;
      const examIdString = exam.entranceExamId;

      if (!examMap.has(examId)) {
        examMap.set(examId, {
          entranceExam: examName,
          examId: examIdString,
          examIdObject: examId,
          testCount: 0,
          scores: [],
          percentages: [],
        });
      }

      const examData = examMap.get(examId);
      examData.testCount++;

      if (
        result.status === TestStatus.COMPLETED ||
        result.status === TestStatus.TIME_UP
      ) {
        examData.scores.push(result.score || 0);
        const percentage = calculatePercentage(
          result.correctCount || 0,
          result.totalQuestions
        );
        examData.percentages.push(percentage);
      }
    }
  });

  const testsByExam = Array.from(examMap.values()).map((data) => ({
    entranceExam: data.entranceExam,
    examId: data.examId,
    testCount: data.testCount,
    averageScore: calculateAverage(data.scores),
    averagePercentage: calculateAverage(data.percentages),
    bestScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
  }));

  // Get recent activity (last 5-10 tests) - simplified format
  const recentActivity = allResults
    .slice(0, 10)
    .filter(
      (r) =>
        r.status === TestStatus.COMPLETED ||
        r.status === TestStatus.TIME_UP ||
        r.status === TestStatus.ABANDONED
    )
    .map((result) => {
      const test = result.testId as any;
      const percentage = calculatePercentage(
        result.correctCount || 0,
        result.totalQuestions
      );

      return {
        attemptId: result._id.toString(),
        test: {
          subject: (test?.testSubject as any)?.subjectName || null,
          entranceExam:
            (test?.entranceExamId as any)?.entranceExamName || null,
        },
        score: result.score || 0,
        percentage: percentage,
        status: result.status,
        completedAt: result.endTime || result.createdAt,
      };
    });

  // Get recent tests with full structure for admin view
  const recentTests = allResults.slice(0, 10).map((result) => {
    const test = result.testId as any;
    return {
      _id: result._id.toString(),
      testId: {
        _id: test?._id?.toString() || "",
        testSubject: {
          _id: (test?.testSubject as any)?._id?.toString() || "",
          subjectName: (test?.testSubject as any)?.subjectName || "Unknown",
        },
        entranceExamId: {
          _id: (test?.entranceExamId as any)?._id?.toString() || "",
          entranceExamName: (test?.entranceExamId as any)?.entranceExamName || "Unknown",
          entranceExamId: (test?.entranceExamId as any)?.entranceExamId || "",
        },
      },
      score: result.score || 0,
      totalQuestions: result.totalQuestions || 0,
      correctCount: result.correctCount || 0,
      status: result.status,
      createdAt: result.createdAt,
      endTime: result.endTime || undefined,
    };
  });

  // Calculate improvement trends
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const lastWeekResults = completedResults.filter(
    (r) => new Date(r.createdAt) >= oneWeekAgo
  );
  const lastMonthResults = completedResults.filter(
    (r) => new Date(r.createdAt) >= oneMonthAgo
  );
  const olderResults = completedResults.filter(
    (r) => new Date(r.createdAt) < oneMonthAgo
  );

  const calculateAveragePercentage = (results: typeof completedResults) => {
    if (results.length === 0) return 0;
    const percentages = results.map((r) =>
      calculatePercentage(r.correctCount || 0, r.totalQuestions)
    );
    return calculateAverage(percentages);
  };

  const lastWeekAverage = calculateAveragePercentage(lastWeekResults);
  const lastMonthAverage = calculateAveragePercentage(lastMonthResults);
  const olderAverage = calculateAveragePercentage(olderResults);

  const improvementTrend = {
    lastWeek: {
      testsTaken: lastWeekResults.length,
      averageScore: lastWeekAverage,
      improvement:
        olderAverage > 0
          ? `+${Math.round((lastWeekAverage - olderAverage) * 100) / 100}`
          : "0",
    },
    lastMonth: {
      testsTaken: lastMonthResults.length,
      averageScore: lastMonthAverage,
      improvement:
        olderAverage > 0
          ? `+${Math.round((lastMonthAverage - olderAverage) * 100) / 100}`
          : "0",
    },
  };

  return {
    totalTests,
    completedTests: completedTests.length,
    inProgressTests: inProgressTests.length,
    abandonedTests: abandonedTests.length,
    averageScore,
    averagePercentage,
    bestScore,
    bestPercentage,
    totalQuestionsAnswered,
    totalCorrectAnswers,
    overallAccuracy,
    totalTimeSpent,
    testsBySubject,
    testsByExam,
    recentActivity,
    recentTests, // Add recentTests with full structure
    improvementTrend,
  };
};

/**
 * Get user profile statistics data
 */
export const getUserProfileStats = async (
  userId: string,
  period: string = "all"
) => {
  // Calculate date range based on period
  const now = new Date();
  let startDate: Date | null = null;

  switch (period) {
    case "week":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
    default:
      startDate = null;
      break;
  }

  // Build filter
  const filter: any = { userId };
  if (startDate) {
    filter.createdAt = { $gte: startDate };
  }

  // Get all test results for the period
  const allResults = await UserResult.find(filter)
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
    .sort({ createdAt: -1 });

  const completedResults = allResults.filter(
    (r) =>
      r.status === TestStatus.COMPLETED || r.status === TestStatus.TIME_UP
  );

  // Summary
  const totalTests = allResults.length;
  const scores = completedResults.map((r) => r.score || 0);
  const percentages = completedResults.map((r) =>
    calculatePercentage(r.correctCount || 0, r.totalQuestions)
  );

  const averageScore = calculateAverage(scores);
  const averagePercentage = calculateAverage(percentages);

  const totalTimeSpent = allResults.reduce(
    (sum, r) => sum + (r.timeTaken || 0),
    0
  );

  // Performance by subject
  const subjectMap = new Map();
  completedResults.forEach((result) => {
    const test = result.testId as any;
    const subject = test?.testSubject;
    if (subject) {
      const subjectId = subject._id.toString();
      const subjectName = subject.subjectName;

      if (!subjectMap.has(subjectId)) {
        subjectMap.set(subjectId, {
          subject: subjectName,
          testCount: 0,
          scores: [],
          percentages: [],
          totalTime: 0,
        });
      }

      const subjectData = subjectMap.get(subjectId);
      subjectData.testCount++;
      subjectData.scores.push(result.score || 0);
      const percentage = calculatePercentage(
        result.correctCount || 0,
        result.totalQuestions
      );
      subjectData.percentages.push(percentage);
      subjectData.totalTime += result.timeTaken || 0;
    }
  });

  const performanceBySubject = Array.from(subjectMap.values()).map(
    (data) => ({
      subject: data.subject,
      testCount: data.testCount,
      averageScore: calculateAverage(data.scores),
      averagePercentage: calculateAverage(data.percentages),
      totalTimeSpent: data.totalTime,
    })
  );

  // Performance by exam
  const examMap = new Map();
  completedResults.forEach((result) => {
    const exam = result.entranceExamId as any;
    if (exam) {
      const examId = exam._id.toString();
      const examName = exam.entranceExamName;
      const examIdString = exam.entranceExamId;

      if (!examMap.has(examId)) {
        examMap.set(examId, {
          entranceExam: examName,
          examId: examIdString,
          testCount: 0,
          scores: [],
          percentages: [],
          totalTime: 0,
        });
      }

      const examData = examMap.get(examId);
      examData.testCount++;
      examData.scores.push(result.score || 0);
      const percentage = calculatePercentage(
        result.correctCount || 0,
        result.totalQuestions
      );
      examData.percentages.push(percentage);
      examData.totalTime += result.timeTaken || 0;
    }
  });

  const performanceByExam = Array.from(examMap.values()).map((data) => ({
    entranceExam: data.entranceExam,
    examId: data.examId,
    testCount: data.testCount,
    averageScore: calculateAverage(data.scores),
    averagePercentage: calculateAverage(data.percentages),
    totalTimeSpent: data.totalTime,
  }));

  // Score distribution
  const scoreDistribution = {
    "0-50": 0,
    "51-60": 0,
    "61-70": 0,
    "71-80": 0,
    "81-90": 0,
    "91-100": 0,
  };

  percentages.forEach((p) => {
    if (p >= 91) {
      scoreDistribution["91-100"]++;
    } else if (p >= 81) {
      scoreDistribution["81-90"]++;
    } else if (p >= 71) {
      scoreDistribution["71-80"]++;
    } else if (p >= 61) {
      scoreDistribution["61-70"]++;
    } else if (p >= 51) {
      scoreDistribution["51-60"]++;
    } else {
      scoreDistribution["0-50"]++;
    }
  });

  // Time analysis
  const timeTakenValues = completedResults
    .map((r) => r.timeTaken || 0)
    .filter((t) => t > 0);
  const averageTimePerTest = calculateAverage(timeTakenValues);
  const fastestCompletion =
    timeTakenValues.length > 0 ? Math.min(...timeTakenValues) : 0;
  const slowestCompletion =
    timeTakenValues.length > 0 ? Math.max(...timeTakenValues) : 0;

  // Streak data
  const sortedResults = allResults.sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA;
  });

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastTestDate: Date | null = null;

  if (sortedResults.length > 0) {
    lastTestDate = sortedResults[0].createdAt;

    // Calculate current streak (consecutive days with tests)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    for (const result of sortedResults) {
      const resultDate = new Date(result.createdAt);
      resultDate.setHours(0, 0, 0, 0);

      if (resultDate.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (resultDate.getTime() < checkDate.getTime()) {
        break;
      }
    }

    // Calculate longest streak
    const dateGroups = new Map();
    sortedResults.forEach((result) => {
      const date = new Date(result.createdAt);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split("T")[0];
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, true);
      }
    });

    const sortedDates = Array.from(dateGroups.keys())
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    tempStreak = 1;
    for (let i = 0; i < sortedDates.length - 1; i++) {
      const currentDate = sortedDates[i];
      const nextDate = sortedDates[i + 1];
      const diffDays = Math.floor(
        (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return {
    period,
    summary: {
      totalTests,
      averageScore,
      averagePercentage,
      totalTimeSpent,
    },
    performanceBySubject,
    performanceByExam,
    scoreDistribution,
    timeAnalysis: {
      averageTimePerTest,
      fastestCompletion,
      slowestCompletion,
    },
    streakData: {
      currentStreak,
      longestStreak,
      lastTestDate: lastTestDate,
    },
  };
};
