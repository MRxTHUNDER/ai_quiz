import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axio";
import { getAllEntranceExams, getSubjectIdFromExam, type EntranceExam } from "../lib/entranceExams";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  id: string;
  questionsText: string;
  Options: string[];
  correctOption: string;
  subject: string | null;
  entranceExam: {
    name: string;
    id: string;
  } | null;
  createdBy: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function MyQuestionsTab() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchEntranceExams();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [currentPage, selectedExam, selectedSubjectName]);

  const fetchEntranceExams = async () => {
    try {
      const exams = await getAllEntranceExams();
      setEntranceExams(exams);
    } catch (error) {
      console.error("Failed to fetch entrance exams:", error);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      if (selectedExam) {
        params.append("entranceExamId", selectedExam);
      }
      if (selectedSubjectName) {
        // Find the subject ID from the selected exam
        const exam = entranceExams.find(
          (e) => e.entranceExamId === selectedExam || e._id === selectedExam
        );
        if (exam) {
          const subjectId = getSubjectIdFromExam(exam, selectedSubjectName);
          if (subjectId) {
            params.append("subjectId", subjectId);
          }
        }
      }

      const response = await axiosInstance.get(
        `/user/questions/my-questions?${params.toString()}`
      );

      if (response.data.success) {
        setQuestions(response.data.data || []);
        setPagination(response.data.pagination || null);
      } else {
        setError("Failed to fetch questions");
        setQuestions([]);
      }
    } catch (err: any) {
      console.error("Error fetching questions:", err);
      setError(
        err?.response?.data?.message || "Failed to load questions. Please try again."
      );
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (exam: string, subjectName: string) => {
    setSelectedExam(exam);
    setSelectedSubjectName(subjectName);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleExamChange = (examId: string) => {
    setSelectedExam(examId);
    setSelectedSubjectName(""); // Reset subject when exam changes
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (pagination) {
      if (newPage >= 1 && newPage <= pagination.totalPages) {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  // Get subjects for selected exam
  const getSubjectsForExam = (): string[] => {
    if (!selectedExam) return [];
    const exam = entranceExams.find(
      (e) => e.entranceExamId === selectedExam || e._id === selectedExam
    );
    if (!exam || !exam.subjects) return [];
    return exam.subjects.map((sub: any) => {
      const subject = sub.subject || sub;
      return typeof subject === "string" ? subject : subject.subjectName || "";
    });
  };

  if (loading && questions.length === 0) {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
        <p className="text-gray-600">Loading your questions...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">My Generated Questions</h1>
      <p className="text-gray-600 mb-6">
        View and manage all questions you have generated
      </p>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="filter-exam"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Entrance Exam
            </label>
            <select
              id="filter-exam"
              value={selectedExam}
              onChange={(e) => handleExamChange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Exams</option>
              {entranceExams.map((exam) => (
                <option key={exam._id} value={exam.entranceExamId}>
                  {exam.entranceExamName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="filter-subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Subject
            </label>
            <select
              id="filter-subject"
              value={selectedSubjectName}
              onChange={(e) => handleFilterChange(selectedExam, e.target.value)}
              disabled={!selectedExam}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
            >
              <option value="">All Subjects</option>
              {getSubjectsForExam().map((subject, idx) => (
                <option key={idx} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>
        </div>
        {(selectedExam || selectedSubjectName) && (
          <button
            onClick={() => handleFilterChange("", "")}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Questions List */}
      {questions.length === 0 && !loading ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-600 mb-2">No questions found</p>
          <p className="text-sm text-gray-500">
            {selectedExam || selectedSubjectName
              ? "Try adjusting your filters"
              : "Start generating questions to see them here"}
          </p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {pagination && (
            <div className="mb-4 text-sm text-gray-600">
              Showing {questions.length} of {pagination.totalCount} questions
            </div>
          )}

          {/* Questions Grid */}
          <div className="space-y-4">
            {questions.map((question) => (
              <div
                key={question.id}
                className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {question.entranceExam && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {question.entranceExam.name}
                        </span>
                      )}
                      {question.subject && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                          {question.subject}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {question.questionsText}
                    </h3>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {question.Options.map((option, index) => {
                    const optionLabel = String.fromCharCode(65 + index); // A, B, C, D
                    const isCorrect = option === question.correctOption;
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-md border-2 ${
                          isCorrect
                            ? "bg-green-50 border-green-300"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center">
                          <span className="font-medium text-gray-700 mr-2">
                            {optionLabel})
                          </span>
                          <span className="text-gray-900">{option}</span>
                          {isCorrect && (
                            <span className="ml-auto px-2 py-1 text-xs font-medium bg-green-600 text-white rounded">
                              Correct
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                  Created: {new Date(question.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-700">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

