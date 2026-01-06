import * as XLSX from "xlsx";
import { User } from "./users";
import { UserProgress } from "./users";

export const exportUsersToExcel = (
  users: User[],
  filename: string = "users.xlsx"
) => {
  const excelData = users.map((user) => ({
    "Sign up date": new Date(user.createdAt).toLocaleString(),
    Name: `${user.firstname} ${user.lastname || ""}`.trim(),
    Email: user.email,
    "Phone Number": user.phoneNumber || "",
    "Exam/Quiz Name":
      typeof user.entranceExamPreference === "object"
        ? user.entranceExamPreference.entranceExamName
        : user.entranceExamPreference || "",
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Sign up date
    { wch: 25 }, // Name
    { wch: 30 }, // Email
    { wch: 15 }, // Phone Number
    { wch: 25 }, // Exam/Quiz Name
  ];
  worksheet["!cols"] = columnWidths;

  // Write file
  XLSX.writeFile(workbook, filename);
};

export const exportUserProgressToExcel = (
  userProgress: UserProgress,
  filename: string = "user-progress.xlsx"
) => {
  const workbook = XLSX.utils.book_new();
  const { user, progress } = userProgress;

  // Sheet 1: User Information
  const userInfo = [
    { Field: "First Name", Value: user.firstname },
    { Field: "Last Name", Value: user.lastname || "" },
    { Field: "Email", Value: user.email },
    { Field: "Phone Number", Value: user.phoneNumber || "" },
    {
      Field: "Entrance Exam Preference",
      Value:
        typeof user.entranceExamPreference === "object"
          ? user.entranceExamPreference.entranceExamName
          : user.entranceExamPreference || "",
    },
    { Field: "Role", Value: user.role },
    { Field: "Created At", Value: new Date(user.createdAt).toLocaleString() },
  ];

  const userInfoSheet = XLSX.utils.json_to_sheet(userInfo);
  XLSX.utils.book_append_sheet(workbook, userInfoSheet, "User Information");

  // Sheet 2: Statistics Overview
  const statistics = [
    { Metric: "Total Tests", Value: progress.totalTests || 0 },
    { Metric: "Completed Tests", Value: progress.completedTests || 0 },
    { Metric: "In Progress Tests", Value: progress.inProgressTests || 0 },
    { Metric: "Abandoned Tests", Value: progress.abandonedTests || 0 },
    {
      Metric: "Average Score",
      Value: progress.averageScore ? progress.averageScore.toFixed(2) : 0,
    },
    {
      Metric: "Average Percentage",
      Value: progress.averagePercentage
        ? progress.averagePercentage.toFixed(2) + "%"
        : "0%",
    },
    { Metric: "Best Score", Value: progress.bestScore || 0 },
    {
      Metric: "Best Percentage",
      Value: progress.bestPercentage
        ? progress.bestPercentage.toFixed(2) + "%"
        : "0%",
    },
    {
      Metric: "Total Questions Answered",
      Value: progress.totalQuestionsAnswered || 0,
    },
    {
      Metric: "Total Correct Answers",
      Value: progress.totalCorrectAnswers || 0,
    },
    {
      Metric: "Overall Accuracy",
      Value: progress.overallAccuracy
        ? progress.overallAccuracy.toFixed(2) + "%"
        : "0%",
    },
  ];

  const statisticsSheet = XLSX.utils.json_to_sheet(statistics);
  XLSX.utils.book_append_sheet(workbook, statisticsSheet, "Statistics");

  // Sheet 3: Tests by Subject
  if (progress.testsBySubject && progress.testsBySubject.length > 0) {
    const testsBySubject = progress.testsBySubject.map((subject) => {
      const subjectWithBest = subject as typeof subject & {
        bestScore?: number;
      };
      return {
        Subject: subject.subject,
        "Test Count": subject.count,
        "Average Score": subject.averageScore.toFixed(2),
        "Average Percentage": subject.averagePercentage.toFixed(2) + "%",
        "Best Score": subjectWithBest.bestScore
          ? subjectWithBest.bestScore.toFixed(2)
          : "N/A",
      };
    });

    const subjectSheet = XLSX.utils.json_to_sheet(testsBySubject);
    XLSX.utils.book_append_sheet(workbook, subjectSheet, "Tests by Subject");
  }

  // Sheet 4: Tests by Exam
  if (progress.testsByExam && progress.testsByExam.length > 0) {
    const testsByExam = progress.testsByExam.map((exam) => {
      const examWithBest = exam as typeof exam & { bestScore?: number };
      return {
        Exam: exam.exam,
        "Test Count": exam.count,
        "Average Score": exam.averageScore.toFixed(2),
        "Average Percentage": exam.averagePercentage.toFixed(2) + "%",
        "Best Score": examWithBest.bestScore
          ? examWithBest.bestScore.toFixed(2)
          : "N/A",
      };
    });

    const examSheet = XLSX.utils.json_to_sheet(testsByExam);
    XLSX.utils.book_append_sheet(workbook, examSheet, "Tests by Exam");
  }

  // Sheet 5: All Test Attempts (Detailed)
  if (progress.recentTests && progress.recentTests.length > 0) {
    const allTests = progress.recentTests.map((test) => {
      const testData = test.testId as {
        _id?: string;
        testSubject?: { _id?: string; subjectName?: string };
        entranceExamId?: {
          _id?: string;
          entranceExamName?: string;
          entranceExamId?: string;
        };
      };
      const subject = testData?.testSubject?.subjectName || "Unknown";
      const exam = testData?.entranceExamId?.entranceExamName || "Unknown";
      const percentage =
        test.totalQuestions > 0
          ? ((test.correctCount / test.totalQuestions) * 100).toFixed(2)
          : "0.00";
      const testWithAttempted = test as typeof test & {
        attemptedCount?: number;
      };
      const attemptedCount =
        testWithAttempted.attemptedCount || test.correctCount;
      const incorrectCount = attemptedCount - test.correctCount;
      const unansweredCount = test.totalQuestions - attemptedCount;

      return {
        "Test ID": test._id,
        Exam: exam,
        Subject: subject,
        Score: test.score,
        "Total Questions": test.totalQuestions,
        "Correct Answers": test.correctCount,
        "Incorrect Answers": incorrectCount,
        Unanswered: unansweredCount,
        Attempted: attemptedCount,
        Percentage: percentage + "%",
        Status: test.status,
        "Started At": new Date(test.createdAt).toLocaleString(),
        "Completed At": test.endTime
          ? new Date(test.endTime).toLocaleString()
          : "N/A",
      };
    });

    const allTestsSheet = XLSX.utils.json_to_sheet(allTests);
    XLSX.utils.book_append_sheet(workbook, allTestsSheet, "All Test Attempts");
  }

  // Sheet 6: Performance Summary (if improvementTrend exists)
  const progressWithTrend = progress as typeof progress & {
    improvementTrend?: {
      lastWeek?: {
        testsTaken: number;
        averageScore: number;
        improvement: string;
      };
      lastMonth?: {
        testsTaken: number;
        averageScore: number;
        improvement: string;
      };
    };
  };
  if (progressWithTrend.improvementTrend) {
    const improvementTrend = progressWithTrend.improvementTrend;
    const performanceSummary = [
      {
        Period: "Last Week",
        "Tests Taken": improvementTrend.lastWeek?.testsTaken || 0,
        "Average Percentage": improvementTrend.lastWeek?.averageScore
          ? improvementTrend.lastWeek.averageScore.toFixed(2) + "%"
          : "0%",
        Improvement: improvementTrend.lastWeek?.improvement || "0",
      },
      {
        Period: "Last Month",
        "Tests Taken": improvementTrend.lastMonth?.testsTaken || 0,
        "Average Percentage": improvementTrend.lastMonth?.averageScore
          ? improvementTrend.lastMonth.averageScore.toFixed(2) + "%"
          : "0%",
        Improvement: improvementTrend.lastMonth?.improvement || "0",
      },
    ];

    const performanceSheet = XLSX.utils.json_to_sheet(performanceSummary);
    XLSX.utils.book_append_sheet(
      workbook,
      performanceSheet,
      "Performance Trends"
    );
  }

  // Write file
  XLSX.writeFile(workbook, filename);
};
