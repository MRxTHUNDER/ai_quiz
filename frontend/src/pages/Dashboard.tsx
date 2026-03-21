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
  Clock,
  Trophy,
  Target,
  Layers,
  Sparkles,
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
    inProgressTests?: number;
    abandonedTests?: number;
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

function formatTimeFromSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return "—";
  const s = Math.floor(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
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
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isCheckingAuth) {
      if (!authUser) {
        navigate("/login");
        return;
      }
      fetchDashboardData();
    }
  }, [authUser, isCheckingAuth, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [progressRes, historyRes] = await Promise.all([
        axiosInstance.get("/user/profile/progress"),
        axiosInstance.get("/user/test-history?limit=6"),
      ]);

      if (progressRes.data) {
        setProgressData(progressRes.data);
      }

      if (historyRes.data?.data) {
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

  if (isCheckingAuth || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto" />
          <p className="mt-4 text-slate-600">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return null;
  }

  const hasCompletedTests = (progressData?.progress.completedTests ?? 0) > 0;

  const formatValue = (
    value: number | undefined | null,
    isPercentage: boolean = false,
  ): string => {
    if (!hasCompletedTests) {
      return "—";
    }
    if (value === undefined || value === null) {
      return "—";
    }
    return isPercentage ? `${value.toFixed(0)}%` : value.toString();
  };

  const formatTimeStat = (seconds: number | undefined) => {
    if (!hasCompletedTests) return "—";
    if (seconds === undefined || seconds === null) return "—";
    return formatTimeFromSeconds(seconds);
  };

  const userName = authUser.firstname || "User";
  const userEmail = authUser.email || "";
  const p = progressData?.progress;

  const testsDone = p?.completedTests;
  const avgPerTest = p?.averagePercentage;
  const subjectsCount = p?.testsBySubject?.length;
  const highScore = p?.bestPercentage;
  const overallAccuracy = p?.overallAccuracy;
  const totalTimeSpent = p?.totalTimeSpent ?? 0;
  const inProgress = p?.inProgressTests ?? 0;

  const highScoreSubject =
    p?.testsBySubject && p.testsBySubject.length > 0
      ? [...p.testsBySubject].sort((a, b) => b.bestScore - a.bestScore)[0]
          ?.subject || null
      : null;

  const subjectData =
    p?.testsBySubject?.map((sub) => ({
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

  const testsChronological = [...testHistory].sort(
    (a, b) =>
      new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const performanceData = testsChronological.map((test, index) => {
    const d = new Date(test.completedAt);
    const shortDate = `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}`;

    return {
      idx: index,
      name: shortDate,
      score: test.percentage,
      subject: test.test.subject || "Unknown",
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="rounded-2xl bg-white border border-slate-200/80 text-slate-900 mb-10 shadow-sm">
          <div className="px-6 py-8 sm:px-10 sm:py-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200/80 px-3 py-1 text-xs font-medium text-slate-600 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-slate-500" aria-hidden />
                Your learning hub
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
                Welcome back, {userName}
              </h1>
              <p className="text-slate-600 text-base leading-relaxed">
                See how you&apos;re doing across subjects, spot trends, and jump
                back into practice when you&apos;re ready.
              </p>
              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate("/test")}
                  className="!border-slate-300 !text-slate-800 hover:!bg-slate-50 !shadow-none !transform-none hover:!scale-100 focus:ring-slate-400 font-semibold"
                >
                  Take a test
                </Button>
              </div>
            </div>

            {hasCompletedTests && p ? (
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 lg:min-w-[280px]">
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Avg. score
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {avgPerTest != null ? `${avgPerTest.toFixed(0)}%` : "—"}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Across finished quizzes
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-3 flex-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    Completed
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-slate-900">
                    {testsDone}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {inProgress > 0
                      ? `${inProgress} in progress`
                      : "All caught up"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-5 py-4 max-w-md lg:max-w-sm">
                <p className="text-sm text-slate-600 leading-relaxed">
                  Complete a quiz to unlock your stats, charts, and recent
                  activity here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Profile + stats */}
        <section className="mb-12" aria-labelledby="overview-heading">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6">
            <div>
              <h2
                id="overview-heading"
                className="text-2xl font-bold text-slate-900"
              >
                Overview
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                {userEmail} · snapshot of your quiz activity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    {hasCompletedTests ? (
                      <div
                        className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white"
                        title="Active learner"
                      />
                    ) : null}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {userName}
                  </h3>
                  <p className="text-sm text-slate-500 mb-5 break-all">
                    {userEmail}
                  </p>
                  <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <div className="text-xl font-bold text-slate-900 tabular-nums">
                        {formatValue(testsDone)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Quizzes done
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-3">
                      <div className="text-xl font-bold text-slate-900 tabular-nums">
                        {formatValue(avgPerTest, true)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Avg. per quiz
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                title="Quizzes completed"
                value={formatValue(testsDone)}
                subtitle="Finished or time-up attempts"
                hint="Counts tests you submitted or ran out of time on."
                color="blue"
              />
              <StatCard
                icon={<TrendingUp className="h-6 w-6" />}
                title="Avg. score (per quiz)"
                value={formatValue(avgPerTest, true)}
                subtitle="Mean of each quiz’s percentage"
                hint="Each quiz counts equally, no matter how many questions it had."
                color="green"
              />
              <StatCard
                icon={<Target className="h-6 w-6" />}
                title="Question accuracy"
                value={formatValue(overallAccuracy, true)}
                subtitle="Correct ÷ all answers you’ve given"
                hint="Uses every question you’ve answered across quizzes—including partial attempts."
                color="teal"
              />
              <StatCard
                icon={<Trophy className="h-6 w-6" />}
                title="Personal best"
                value={formatValue(highScore, true)}
                subtitle={
                  highScoreSubject
                    ? `Top marks in ${highScoreSubject}`
                    : "Your highest quiz %"
                }
                color="orange"
              />
              <StatCard
                icon={<Layers className="h-6 w-6" />}
                title="Subjects explored"
                value={formatValue(subjectsCount)}
                subtitle="Subjects with at least one quiz"
                hint="Based on subjects tied to your attempts."
                color="purple"
              />
              <StatCard
                icon={<Clock className="h-6 w-6" />}
                title="Time on quizzes"
                value={formatTimeStat(totalTimeSpent)}
                subtitle="Total time (finished attempts)"
                hint="Sum of time spent on recorded attempts, shown as minutes or hours."
                color="blue"
              />
            </div>
          </div>
        </section>

        {/* Charts */}
        {hasCompletedTests && (
          <section className="mb-12" aria-labelledby="insights-heading">
            <div className="mb-6">
              <h2
                id="insights-heading"
                className="text-2xl font-bold text-slate-900"
              >
                Performance insights
              </h2>
              <p className="text-slate-600 text-sm mt-1 max-w-2xl">
                How your attempts spread across subjects, and how your last few
                quiz scores moved over time (up to 6 most recent).
              </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Mix by subject
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Share of quizzes per subject you&apos;ve attempted
                </p>
                <div className="h-72">
                  {subjectData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={subjectData}
                          cx="50%"
                          cy="50%"
                          innerRadius={68}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {subjectData.map((_, index) => (
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
                          formatter={(value) => [value, "Quizzes"]}
                        />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg bg-slate-50 text-slate-500 text-sm">
                      No subject breakdown yet
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-1">
                  Recent score trend
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                  Percent score on each of your latest quizzes (oldest → newest)
                </p>
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
                          stroke="#e2e8f0"
                        />
                        <XAxis
                          dataKey="idx"
                          type="number"
                          domain={[0, Math.max(0, performanceData.length - 1)]}
                          ticks={performanceData.map((_, i) => i)}
                          tickFormatter={(v) =>
                            performanceData[Number(v)]?.name ?? ""
                          }
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 11, fill: "#64748b" }}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          }}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.name ?? ""
                          }
                          formatter={(value, _name, props) => [
                            `${Number(value).toFixed(0)}%`,
                            props.payload.subject || "Score",
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="#2563eb"
                          strokeWidth={2.5}
                          dot={{
                            r: 4,
                            fill: "#ffffff",
                            strokeWidth: 2,
                            stroke: "#2563eb",
                          }}
                          activeDot={{ r: 7, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg bg-slate-50 text-slate-500 text-sm">
                      Complete a few quizzes to see your trend
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Recent quizzes */}
        <section className="mb-8" aria-labelledby="recent-heading">
          <div className="mb-6">
            <h2
              id="recent-heading"
              className="text-2xl font-bold text-slate-900"
            >
              Recent quizzes
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Newest finished attempts—tap a card to review details.
            </p>
          </div>
          {testHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {testHistory.map((quiz) => {
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
          ) : (
            <div className="bg-white p-10 rounded-xl border border-slate-200/80 text-center shadow-sm max-w-lg mx-auto">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <BookOpen className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                No quizzes yet
              </h3>
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                When you finish a test, it will show up here with your score so
                you can track progress over time.
              </p>
              <Button
                onClick={() => navigate("/test")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Start your first quiz
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;
