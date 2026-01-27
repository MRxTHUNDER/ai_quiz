import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, Trophy, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import Button from "../components/Button";
import { testApi, TestResult as TestResultType } from "../lib/testApi";
import MathRenderer from "../components/MathRenderer";

function TestResult() {
  const navigate = useNavigate();
  const { attemptId } = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<TestResultType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (attemptId) {
      loadResult();
    }
  }, [attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      setError(null);
      const resultData = await testApi.getTestResult(attemptId!);
      setResult(resultData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load test result");
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading test result...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Result not found"}</p>
          <Button onClick={() => navigate("/test/available")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate("/test/available")}
            variant="outline"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tests
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Results</h1>
          <p className="text-gray-600">
            {result.test.entranceExam} - {result.test.subject}
          </p>
        </div>

        {/* Score Summary Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <Trophy className="h-8 w-8 mr-3 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-900">Your Score</h2>
              </div>
              <p className="text-gray-600">
                {result.correctCount} out of {result.totalQuestions} correct
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold mb-2 text-gray-900">{result.percentage}%</div>
              <p className="text-gray-600">Percentage</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Total Questions</span>
              <span className="text-2xl font-bold text-gray-900">
                {result.totalQuestions}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Attempted</span>
              <span className="text-2xl font-bold text-blue-600">
                {result.attemptedCount}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Correct</span>
              <span className="text-2xl font-bold text-green-600">
                {result.correctCount}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-600">Incorrect</span>
              <span className="text-2xl font-bold text-red-600">
                {result.incorrectCount}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <Clock className="h-5 w-5 text-gray-600 mr-2" />
              <h3 className="font-semibold text-gray-900">Time Taken</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatTime(result.timeTaken)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <span className="text-gray-600 mr-2">Status:</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  result.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : result.status === "time_up"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {result.status === "completed"
                  ? "Completed"
                  : result.status === "time_up"
                  ? "Time Up"
                  : result.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Unanswered: {result.unansweredCount} questions
            </p>
          </div>
        </div>

        {/* Answer Review */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Answer Review
          </h3>

          <div className="space-y-4">
            {result.answers.map((answer, index) => {
              const isExpanded = expandedQuestions.has(answer.questionId);

              return (
                <div
                  key={answer.questionId}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleQuestion(answer.questionId)}
                    className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 mr-3">
                        Question {index + 1}
                      </span>
                      {answer.isCorrect ? (
                        <span className="flex items-center text-green-600">
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Correct
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600">
                          <XCircle className="h-4 w-4 mr-1" />
                          Incorrect
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500">
                      {isExpanded ? "Hide" : "Show Details"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="p-4 bg-gray-50 border-t">
                      <p className="font-medium text-gray-900 mb-4">
                        <MathRenderer text={answer.questionText} />
                      </p>

                      <div className="space-y-2 mb-4">
                        {answer.Options.map((option, optIndex) => {
                          const optionLabel = String.fromCharCode(65 + optIndex);
                          const isSelected = answer.selectedOption === optionLabel;
                          const isCorrect = answer.correctOption === optionLabel;

                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg border-2 ${
                                isCorrect
                                  ? "border-green-500 bg-green-50"
                                  : isSelected
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {optionLabel})
                                </span>
                                <span>
                                  <MathRenderer text={option} />
                                </span>
                                {isCorrect && (
                                  <CheckCircle2 className="h-5 w-5 text-green-600 ml-auto" />
                                )}
                                {isSelected && !isCorrect && (
                                  <XCircle className="h-5 w-5 text-red-600 ml-auto" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <div>
                          <span className="text-gray-600">Your Answer: </span>
                          <span className="font-medium">
                            {answer.selectedOption || "Not answered"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Correct Answer: </span>
                          <span className="font-medium text-green-600">
                            {answer.correctOption}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button
            onClick={() => navigate("/test/available")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Take Another Test
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TestResult;

