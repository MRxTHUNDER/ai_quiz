import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader2,
  User,
  Mail,
  Calendar,
  Award,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Phone,
  GraduationCap,
  Download,
} from "lucide-react";
import { usersApi, UserProgress } from "@/lib/users";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { exportUserProgressToExcel } from "@/lib/excelUtils";

function UserDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserProgress = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getUserProgress(userId!);
      setProgress(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to load user progress");
      console.error("Error loading user progress:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  const handleExportToExcel = () => {
    if (!progress) return;
    
    try {
      setExporting(true);
      // Generate filename with user name and timestamp
      const timestamp = new Date().toISOString().split("T")[0];
      const userName = `${progress.user.firstname}_${progress.user.lastname || "User"}`.replace(/\s+/g, "_");
      const filename = `user-progress-${userName}-${timestamp}.xlsx`;
      
      // Export to Excel
      exportUserProgressToExcel(progress, filename);
    } catch (err) {
      console.error("Error exporting user progress:", err);
      alert("Failed to export user progress. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (error || !progress) {
    return (
      <div className="p-6">
        <Button
          variant="outline"
          onClick={() => navigate("/users")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Users
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  const { user, progress: userProgress } = progress;

  // Ensure arrays exist with default empty arrays
  const safeProgress = {
    ...userProgress,
    testsBySubject: userProgress?.testsBySubject || [],
    testsByExam: userProgress?.testsByExam || [],
    recentTests: userProgress?.recentTests || [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => navigate("/users")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-600 mt-2">
            View user information and test progress
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          disabled={exporting}
          variant="outline"
          className="gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Export to Excel
            </>
          )}
        </Button>
      </div>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {user.firstname} {user.lastname}
                </h3>
                <div className="flex items-center gap-2 mt-1 text-gray-600">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  Joined: {new Date(user.createdAt).toLocaleDateString()}
                </span>
              </div>
              {user.phoneNumber && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">{user.phoneNumber}</span>
                </div>
              )}
              {user.entranceExamPreference && (
                <div className="flex items-center gap-2 text-gray-600">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-sm">
                    {typeof user.entranceExamPreference === "object"
                      ? user.entranceExamPreference.entranceExamName
                      : "Entrance Exam"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {safeProgress.totalTests || "-"}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {safeProgress.completedTests || "-"}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {safeProgress.inProgressTests || "-"}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Abandoned</p>
                <p className="text-2xl font-bold text-red-600">
                  {safeProgress.abandonedTests || "-"}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-gray-600">Average Score</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {safeProgress.averageScore ? safeProgress.averageScore.toFixed(1) : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span className="text-gray-600">Average Percentage</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {safeProgress.averagePercentage ? safeProgress.averagePercentage.toFixed(1) + "%" : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span className="text-gray-600">Best Score</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {safeProgress.bestScore || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <span className="text-gray-600">Best Percentage</span>
              </div>
              <span className="text-xl font-bold text-gray-900">
                {safeProgress.bestPercentage ? safeProgress.bestPercentage.toFixed(1) + "%" : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-gray-600">Overall Accuracy</span>
              <span className="text-xl font-bold text-gray-900">
                {safeProgress.overallAccuracy ? safeProgress.overallAccuracy.toFixed(1) + "%" : "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Questions Answered</span>
              <span className="text-lg font-semibold text-gray-900">
                {safeProgress.totalQuestionsAnswered || "-"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Correct Answers</span>
              <span className="text-lg font-semibold text-green-600">
                {safeProgress.totalCorrectAnswers || "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tests by Subject */}
        <Card>
          <CardHeader>
            <CardTitle>Tests by Subject</CardTitle>
            <CardDescription>Performance breakdown by subject</CardDescription>
          </CardHeader>
          <CardContent>
            {safeProgress.testsBySubject.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No data available
              </p>
            ) : (
              <div className="space-y-3">
                {safeProgress.testsBySubject.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {subject.subject}
                      </p>
                      <p className="text-sm text-gray-600">
                        {subject.count} test{subject.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {subject.averagePercentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500">
                        Avg: {subject.averageScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tests by Exam */}
      <Card>
        <CardHeader>
          <CardTitle>Tests by Entrance Exam</CardTitle>
          <CardDescription>Performance breakdown by exam</CardDescription>
        </CardHeader>
        <CardContent>
          {safeProgress.testsByExam.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No data available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {safeProgress.testsByExam.map((exam, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{exam.exam}</h4>
                    <span className="text-sm text-gray-600">
                      {exam.count} test{exam.count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average</span>
                    <span className="font-semibold text-gray-900">
                      {exam.averagePercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Attempts</CardTitle>
          <CardDescription>Latest test results</CardDescription>
        </CardHeader>
        <CardContent>
          {safeProgress.recentTests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tests taken yet</p>
          ) : (
            <div className="space-y-3">
              {safeProgress.recentTests.slice(0, 10).map((test) => {
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
                const exam =
                  testData?.entranceExamId?.entranceExamName || "Unknown";
                const percentage =
                  test.totalQuestions > 0
                    ? ((test.correctCount / test.totalQuestions) * 100).toFixed(
                        1
                      )
                    : "0.0";

                return (
                  <div
                    key={test._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-gray-900">
                          {exam} - {subject}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            test.status === "completed" ||
                            test.status === "time_up"
                              ? "bg-green-100 text-green-700"
                              : test.status === "in_progress"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {test.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>
                          Score: {test.score}/{test.totalQuestions}
                        </span>
                        <span>Correct: {test.correctCount}</span>
                        <span>
                          {new Date(test.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-gray-900">
                        {percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UserDetails;
