import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Atom,
  BookOpen,
  TrendingUp,
  Beaker,
  Heart,
  History,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import Button from "../components/Button";
import StatCard from "../components/StatCard";
import QuizCard from "../components/QuizCard";
import { useAuthStore } from "../store/useAuthStore";
import { axiosInstance } from "../lib/axio";

interface ProgressData {
  user: {
    id: string;
    email: string;
    firstname: string;
    lastname: string;
    role: string;
  };
  progress: {
    totalTests: number;
    completedTests: number;
    averageScore: number;
    averagePercentage: number;
    bestScore: number;
    bestPercentage: number;
    overallAccuracy: number;
    totalTimeSpent: number;
    testsBySubject: Array<{
      subject: string;
      subjectId: string;
      testCount: number;
      averageScore: number;
      averagePercentage: number;
      bestScore: number;
    }>;
  };
}

interface TestHistoryItem {
  attemptId: string;
  test: {
    subject: string | null;
    entranceExam: string | null;
    entranceExamId: string | null;
  };
  score: number;
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  status: string;
  completedAt: string;
}

const getSubjectIcon = (subject: string | null) => {
  if (!subject) return <BookOpen className="h-6 w-6" />;
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes("math")) return <Calculator className="h-6 w-6" />;
  if (subjectLower.includes("physics")) return <Atom className="h-6 w-6" />;
  if (subjectLower.includes("chemistry")) return <Beaker className="h-6 w-6" />;
  if (subjectLower.includes("biology")) return <Heart className="h-6 w-6" />;
  if (subjectLower.includes("history")) return <History className="h-6 w-6" />;
  if (subjectLower.includes("literature"))
    return <BookOpen className="h-6 w-6" />;
  return <BookOpen className="h-6 w-6" />;
};

const getSubjectColor = (subject: string | null) => {
  if (!subject) return "blue";
  const subjectLower = subject.toLowerCase();
  if (subjectLower.includes("math")) return "blue";
  if (subjectLower.includes("physics")) return "purple";
  if (subjectLower.includes("chemistry")) return "teal";
  if (subjectLower.includes("biology")) return "green";
  if (subjectLower.includes("history")) return "blue";
  if (subjectLower.includes("literature")) return "orange";
  return "blue";
};

function Dashboard() {
  const navigate = useNavigate();
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication on mount
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Check authentication and fetch data
    if (!isCheckingAuth) {
      if (!authUser) {
        navigate("/login");
        return;
      }
      // Fetch data when authenticated
      fetchDashboardData();
    }
  }, [authUser, isCheckingAuth, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [progressRes, historyRes] = await Promise.all([
        axiosInstance.get("/user/profile/progress"),
        // Fetch all finished tests (completed and time_up) - no status filter to get all finished tests
        axiosInstance.get("/user/test-history?limit=6"),
      ]);

      // Axios interceptor flattens the response, so progressRes.data is already the data object
      // Backend returns: { success: true, data: { user: {...}, progress: {...} } }
      // After interceptor: response.data = { user: {...}, progress: {...} }
      if (progressRes.data) {
        setProgressData(progressRes.data);
      }

      // For test history, the interceptor preserves arrays in data.data
      // Backend returns: { success: true, data: [...], pagination: {...} }
      // After interceptor: response.data = { data: [...], pagination: {...} }
      if (historyRes.data?.data) {
        // Filter to only show completed or time_up tests (finished tests)
        const finishedTests = historyRes.data.data.filter(
          (test: TestHistoryItem) =>
            test.status === "completed" || test.status === "time_up",
        );
        setTestHistory(finishedTests);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state
  if (isCheckingAuth || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authUser) {
    return null;
  }

  // Helper function to format values - show "-" if no data, otherwise show the value
  // If no tests completed, show "-" for all stats
  // Otherwise, show actual values (even 0% is valid if they completed tests)
  const hasCompletedTests = (progressData?.progress.completedTests ?? 0) > 0;

  const formatValue = (
    value: number | undefined | null,
    isPercentage: boolean = false,
  ): string => {
    // If no tests completed, show "-" for all stats
    if (!hasCompletedTests) {
      return "-";
    }
    // If value is null/undefined, show "-"
    if (value === undefined || value === null) {
      return "-";
    }
    // Show actual value (0% is valid if tests were completed)
    return isPercentage ? `${value.toFixed(0)}%` : value.toString();
  };

  const userName = authUser.firstname || "User";
  const userEmail = authUser.email || "";
  const testsDone = progressData?.progress.completedTests;
  const avgScore = progressData?.progress.averagePercentage;
  const subjectsMastered = progressData?.progress.testsBySubject?.length;
  const highScore = progressData?.progress.bestPercentage;
  const overallAccuracy = progressData?.progress.overallAccuracy;
  const highScoreSubject =
    progressData?.progress.testsBySubject &&
    progressData.progress.testsBySubject.length > 0
      ? progressData.progress.testsBySubject.sort(
          (a, b) => b.bestScore - a.bestScore,
        )[0]?.subject || "N/A"
      : "N/A";

  const subjectData =
    progressData?.progress.testsBySubject?.map((sub) => ({
      name: sub.subject || "Unknown",
      value: sub.testCount,
    })) || [];
  const COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
  ];

  const performanceData = [...testHistory].reverse().map((test) => {
    const d = new Date(test.completedAt);
    return {
      name: `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`,
      score: test.percentage,
      subject: test.test.subject || "Unknown",
    };
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome, {userName}!
            </h1>
            <p className="text-gray-600 mb-6">
              Dive into new quizzes, track your progress, and master your
              subjects with Quiz Genius AI.
            </p>
            <Button
              onClick={() => navigate("/test")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Take Test
            </Button>
          </div>
        </div>

        {/* My Overview Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">My Overview</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <h3 className="text-lg font-semibold text-blue-600 mb-1">
                  {userName}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{userEmail}</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatValue(testsDone)}
                    </div>
                    <div className="text-sm text-gray-600">Tests Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatValue(avgScore, true)}
                    </div>
                    <div className="text-sm text-gray-600">Avg. Score</div>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-blue-600 text-sm font-medium hover:text-blue-700"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-6">
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Subjects Attempted"
                value={formatValue(subjectsMastered)}
                subtitle="Total subjects with tests"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="High Score"
                value={formatValue(highScore, true)}
                subtitle={
                  highScoreSubject !== "N/A"
                    ? `Achieved in ${highScoreSubject}`
                    : "No tests completed yet"
                }
                color="green"
              />
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Total Tests"
                value={formatValue(testsDone)}
                subtitle="Tests completed"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="Avg Accuracy"
                value={formatValue(overallAccuracy, true)}
                subtitle="Overall accuracy"
                color="green"
              />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        {hasCompletedTests && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Performance Insights
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pie Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Tests by Subject
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={subjectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {subjectData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        formatter={(value) => [value, "Tests"]}
                      />
                      <Legend iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line Chart */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Recent Scores Trend
                </h3>
                <div className="h-72">
                  {performanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={performanceData}
                        margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                        />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 12, fill: "#6b7280" }}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          formatter={(value, name, props) => [
                            `${Number(value).toFixed(0)}%`,
                            props.payload.subject || "Score",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{
                            r: 5,
                            fill: "#ffffff",
                            strokeWidth: 2,
                            stroke: "#3b82f6",
                          }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex bg-gray-50 h-full items-center justify-center text-gray-400 rounded-lg">
                      No data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Quizzes */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Recent Quizzes
          </h2>
          {testHistory.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                {testHistory.slice(0, 4).map((quiz) => {
                  const subject = quiz.test.subject || "Unknown";
                  const date = new Date(quiz.completedAt)
                    .toISOString()
                    .split("T")[0];
                  return (
                    <QuizCard
                      key={quiz.attemptId}
                      attemptId={quiz.attemptId}
                      subject={subject}
                      score={`${quiz.percentage.toFixed(0)}%`}
                      date={date}
                      icon={getSubjectIcon(subject)}
                      color={getSubjectColor(subject)}
                    />
                  );
                })}
              </div>
              {testHistory.length > 4 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {testHistory.slice(4, 6).map((quiz) => {
                    const subject = quiz.test.subject || "Unknown";
                    const date = new Date(quiz.completedAt)
                      .toISOString()
                      .split("T")[0];
                    return (
                      <QuizCard
                        key={quiz.attemptId}
                        attemptId={quiz.attemptId}
                        subject={subject}
                        score={`${quiz.percentage.toFixed(0)}%`}
                        date={date}
                        icon={getSubjectIcon(subject)}
                        color={getSubjectColor(subject)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-gray-100 text-center">
              <p className="text-gray-600 mb-4">No quizzes completed yet.</p>
              <Button
                onClick={() => navigate("/test")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Take Your First Test
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
