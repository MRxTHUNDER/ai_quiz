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
        axiosInstance.get("/user/test-history?status=completed&limit=6"),
      ]);

      if (progressRes.data?.data) {
        setProgressData(progressRes.data.data);
      }
      if (historyRes.data?.data) {
        setTestHistory(historyRes.data.data);
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

  const userName = authUser.firstname || "User";
  const userEmail = authUser.email || "";
  const testsDone = progressData?.progress.completedTests || 0;
  const avgScore = progressData?.progress.averagePercentage || 0;
  const subjectsMastered = progressData?.progress.testsBySubject.length || 0;
  const highScore = progressData?.progress.bestPercentage || 0;
  const highScoreSubject =
    progressData?.progress.testsBySubject.sort(
      (a, b) => b.bestScore - a.bestScore
    )[0]?.subject || "N/A";

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
                      {testsDone}
                    </div>
                    <div className="text-sm text-gray-600">Tests Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">
                      {avgScore.toFixed(0)}%
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
                value={subjectsMastered.toString()}
                subtitle="Total subjects with tests"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="High Score"
                value={`${highScore.toFixed(0)}%`}
                subtitle={`Achieved in ${highScoreSubject}`}
                color="green"
              />
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Total Tests"
                value={testsDone.toString()}
                subtitle="Tests completed"
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="Avg Accuracy"
                value={`${(progressData?.progress.overallAccuracy || 0).toFixed(
                  0
                )}%`}
                subtitle="Overall accuracy"
                color="green"
              />
            </div>
          </div>
        </div>

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
