import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Clock,
  ArrowRight,
  Loader2,
  GraduationCap,
  Plus,
} from "lucide-react";
import Button from "../components/Button";
import SelectionCard from "../components/SelectionCard";
import { testApi, Test, EntranceExam, Subject } from "../lib/testApi";

function Tests() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadSubjects(selectedExamId);
    } else {
      setSubjects([]);
      setSelectedSubjectId("");
    }
  }, [selectedExamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [testsResult, exams] = await Promise.all([
        testApi.getAvailableTests({ limit: 50 }),
        testApi.getEntranceExams(),
      ]);
      // Ensure tests is always an array
      setTests(Array.isArray(testsResult.data) ? testsResult.data : []);
      setEntranceExams(Array.isArray(exams) ? exams : []);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load data"
      );
      console.error("Error loading data:", err);
      // Set empty arrays on error to prevent map errors
      setTests([]);
      setEntranceExams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubjects = async (examId: string) => {
    try {
      setLoadingSubjects(true);
      setError(null);
      const result = await testApi.getEntranceExamSubjects(examId);
      setSubjects(result.subjects);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load subjects");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleStartTest = async (test: Test) => {
    try {
      setError(null); // Clear any previous errors
      const attempt = await testApi.startTest(test.id, test.entranceExam._id);
      navigate(`/test/${test.id}/take`, {
        state: { attemptId: attempt.attemptId, testId: test.id },
      });
    } catch (err: any) {
      console.error("Error starting test:", err);
      const errorMessage =
        err.response?.data?.message || "Failed to start test";
      setError(errorMessage);
      // Error is displayed in the error message div
    }
  };

  const handleCreateTest = async () => {
    if (!selectedExamId || !selectedSubjectId) {
      alert("Please select both entrance exam and subject");
      return;
    }

    try {
      setCreatingTest(true);
      setError(null);

      // First, get available tests for this exam and subject
      const testsResult = await testApi.getAvailableTests({
        entranceExamId: selectedExamId,
        subjectId: selectedSubjectId,
        limit: 1,
      });

      let testId: string;

      if (testsResult.data.length > 0) {
        // Test exists, use it
        const test = testsResult.data[0];
        testId = test.id;
      } else {
        // No test exists - create one
        const createdTest = await testApi.createTest(
          selectedExamId,
          selectedSubjectId
        );
        testId = createdTest.id;
      }

      // Start the test (whether it was existing or newly created)
      // Use selectedExamId directly since we know it's correct
      const attempt = await testApi.startTest(testId, selectedExamId);
      navigate(`/test/${testId}/take`, {
        state: { attemptId: attempt.attemptId, testId: testId },
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Failed to start test";
      setError(errorMessage);
      // Error is already displayed in the error message div above
    } finally {
      setCreatingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Take a Test</h1>
          <p className="text-gray-600">
            Choose from available tests or create a new one
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Available Tests Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Available Tests
          </h2>

          {tests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md border border-gray-200">
              <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No tests available
              </h3>
              <p className="text-gray-600">
                Create a new test using the form below
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {test.subject.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {test.entranceExam.name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {test.totalQuestions} Questions
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {test.durationMinutes} Minutes
                    </div>
                  </div>

                  <Button
                    onClick={() => handleStartTest(test)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Start Test
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create New Test Section */}
        <div className="bg-white rounded-xl shadow-md p-8 border border-gray-200">
          <div className="flex items-center mb-6">
            <Plus className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">
              Create New Test
            </h2>
          </div>
          <p className="text-gray-600 mb-8">
            Select an entrance exam and subject to create a new test
          </p>

          {/* Entrance Exam Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              1. Select an Entrance Exam
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {entranceExams.map((exam) => (
                <SelectionCard
                  key={exam._id}
                  icon={<GraduationCap className="h-8 w-8" />}
                  title={exam.entranceExamName}
                  isSelected={selectedExamId === exam._id}
                  onClick={() => {
                    setSelectedExamId(exam._id);
                    setSelectedSubjectId("");
                  }}
                />
              ))}
            </div>
          </div>

          {/* Subject Selection */}
          {selectedExamId && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                2. Select a Subject
              </h3>
              {loadingSubjects ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
                  <p className="text-gray-600">Loading subjects...</p>
                </div>
              ) : subjects.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">
                    No subjects available for this exam
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {subjects.map((subject) => (
                    <SelectionCard
                      key={subject._id}
                      icon={<BookOpen className="h-8 w-8" />}
                      title={`${subject.subjectName} (${subject.testDuration} min)`}
                      isSelected={selectedSubjectId === subject._id}
                      onClick={() => setSelectedSubjectId(subject._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start Test Button */}
          <div className="text-center">
            <Button
              size="lg"
              onClick={handleCreateTest}
              className="px-12"
              disabled={!selectedExamId || !selectedSubjectId || creatingTest}
            >
              {creatingTest ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Starting Test...
                </>
              ) : (
                <>
                  Start Test
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tests;
