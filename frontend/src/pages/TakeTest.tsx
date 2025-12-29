import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Button from "../components/Button";
import { testApi, Question, TestProgress } from "../lib/testApi";

interface AnswerState {
  [questionId: string]: string;
}

function TakeTest() {
  const navigate = useNavigate();
  const { testId } = useParams<{ testId: string }>();
  const location = useLocation();
  const [attemptId, setAttemptId] = useState<string | null>(
    location.state?.attemptId || null
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerState>({});
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [progress, setProgress] = useState<TestProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(
    null
  );

  // Load test data
  useEffect(() => {
    if (!testId) {
      navigate("/test/available");
      return;
    }

    initializeTest();
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [testId]);

  // Save answers to localStorage
  useEffect(() => {
    if (attemptId && Object.keys(answers).length > 0) {
      localStorage.setItem(
        `test_answers_${attemptId}`,
        JSON.stringify(answers)
      );
    }
  }, [answers, attemptId]);

  const initializeTest = async () => {
    try {
      setLoading(true);
      setError(null);

      // If no attemptId, start the test (this shouldn't happen, but handle it)
      if (!attemptId && testId) {
        // We need entranceExamId - this should come from the test selection
        alert(
          "Test not properly initialized. Please start from test selection."
        );
        navigate("/test");
        return;
      }

      // Get questions
      const questionsData = await testApi.getTestQuestions(testId!, attemptId!);

      setQuestions(questionsData.questions);
      setAttemptId(questionsData.attemptId);

      // Load saved answers from localStorage
      const savedAnswers = localStorage.getItem(
        `test_answers_${questionsData.attemptId}`
      );
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch (e) {
          console.error("Failed to parse saved answers", e);
        }
      }

      // Get progress and start timer
      await updateProgress();
      startTimer();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load test");
      console.error("Error initializing test:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async () => {
    if (!attemptId) return;

    try {
      const progressData = await testApi.getTestProgress(attemptId);
      setProgress(progressData);
      setRemainingTime(progressData.remainingTime);

      // Check if time is up
      if (
        progressData.remainingTime <= 0 &&
        progressData.status === "in_progress"
      ) {
        handleTimeUp();
      }
    } catch (err) {
      console.error("Error updating progress:", err);
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setTimerInterval(interval);
  };

  const handleAnswerSelect = async (questionId: string, option: string) => {
    // Update local state immediately
    setAnswers((prev) => ({ ...prev, [questionId]: option }));

    // Submit to backend (debounced would be better, but simple for now)
    if (attemptId) {
      try {
        await testApi.submitAnswer(attemptId, questionId, option);
        await updateProgress();
      } catch (err) {
        console.error("Error submitting answer:", err);
        // Still keep local state even if API fails
      }
    }
  };

  const handleTimeUp = async () => {
    if (!attemptId || submitting) return;

    try {
      setSubmitting(true);
      await testApi.timeUp(attemptId);
      // Clear localStorage
      if (attemptId) {
        localStorage.removeItem(`test_answers_${attemptId}`);
      }
      navigate(`/test/${attemptId}/result`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTest = async () => {
    if (!attemptId || submitting) return;

    const confirmSubmit = window.confirm(
      "Are you sure you want to submit the test? You cannot change your answers after submission."
    );

    if (!confirmSubmit) return;

    try {
      setSubmitting(true);
      await testApi.endTest(attemptId);
      // Clear localStorage
      if (attemptId) {
        localStorage.removeItem(`test_answers_${attemptId}`);
      }
      navigate(`/test/${attemptId}/result`);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to submit test");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading test...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => navigate("/test/available")}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Timer */}
      <div className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Test in Progress
              </h1>
              <p className="text-sm text-gray-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>

            <div className="flex items-center space-x-6">
              {/* Progress */}
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  {answeredCount} / {questions.length} Answered
                </p>
                <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(answeredCount / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Timer */}
              <div
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  remainingTime < 300
                    ? remainingTime < 60
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <Clock className="h-5 w-5" />
                <span className="font-mono font-semibold text-lg">
                  {formatTime(remainingTime)}
                </span>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmitTest}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  "Submit Test"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Question List Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">
                Questions ({questions.length})
              </h3>
              <div className="grid grid-cols-5 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                {questions.map((q, index) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = index === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`p-2 rounded text-sm font-medium transition-colors ${
                        isCurrent
                          ? "bg-blue-600 text-white ring-2 ring-blue-300"
                          : isAnswered
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Display */}
          <div className="lg:col-span-3">
            {currentQuestion && (
              <div className="bg-white rounded-lg shadow-md p-8">
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded">
                      Question {currentQuestion.questionNumber}
                    </span>
                    {answers[currentQuestion.id] && (
                      <span className="text-sm text-green-600 flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Answered
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    {currentQuestion.questionsText}
                  </h2>
                </div>

                <div className="space-y-3">
                  {currentQuestion.Options.map((option, index) => {
                    const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                    const isSelected =
                      answers[currentQuestion.id] === optionLabel;

                    return (
                      <button
                        key={index}
                        onClick={() =>
                          handleAnswerSelect(currentQuestion.id, optionLabel)
                        }
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                              isSelected
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="font-medium text-gray-700 mr-2">
                            {optionLabel})
                          </span>
                          <span className="text-gray-900">{option}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    onClick={() => goToQuestion(currentQuestionIndex - 1)}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    disabled={currentQuestionIndex === questions.length - 1}
                    variant="outline"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TakeTest;
