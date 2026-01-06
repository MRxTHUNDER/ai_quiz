import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { axiosInstance } from "@/lib/axios";
import {
  getAllEntranceExams,
  getSubjectNamesFromExam,
  type EntranceExam,
} from "@/lib/entranceExams";
import { useAuthStore } from "@/store/useAuthStore";
import QuestionsList, { type Question } from "@/components/QuestionsList";
import QuestionsFilter from "@/components/QuestionsFilter";

interface Pagination {
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function Questions() {
  const authUser = useAuthStore((s) => s.authUser);
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedEntranceExamId, setSelectedEntranceExamId] =
    useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [numQuestions, setNumQuestions] = useState<number>(50);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // My Questions tab state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("generate");

  // Filter state for "My Questions" tab
  const [filterEntranceExamId, setFilterEntranceExamId] = useState<string>("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");

  // Fetch entrance exams on component mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoadingExams(true);
        const exams = await getAllEntranceExams();
        setEntranceExams(exams);
      } catch (error) {
        console.error("Failed to fetch entrance exams:", error);
        setStatus({
          type: "error",
          message: "Failed to load entrance exams. Please refresh the page.",
        });
      } finally {
        setLoadingExams(false);
      }
    };

    fetchExams();
  }, []);

  // Update filtered subjects when exam selection changes
  useEffect(() => {
    if (selectedEntranceExamId) {
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === selectedEntranceExamId ||
          exam._id === selectedEntranceExamId
      );
      if (selectedExam) {
        const subjectNames = getSubjectNamesFromExam(selectedExam);
        setFilteredSubjects(subjectNames);
      } else {
        setFilteredSubjects([]);
      }
      setSelectedSubject(""); // Reset subject when exam changes
    } else {
      setFilteredSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedEntranceExamId, entranceExams]);

  const handleEntranceExamChange = (examId: string) => {
    setSelectedEntranceExamId(examId);
    setSelectedSubject(""); // Reset subject when exam changes
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setStatus({
          type: "error",
          message: "Please select a PDF file",
        });
        return;
      }
      setSelectedFile(file);
      setStatus({ type: null, message: "" });
    }
  };

  // Fetch questions for "My Questions" tab
  const fetchQuestions = useCallback(
    async (page: number = 1) => {
      const userId = authUser?.id || authUser?._id;

      if (!userId) {
        console.warn("No user ID available for fetching questions");
        return;
      }

      setLoadingQuestions(true);
      try {
        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
        });

        if (filterEntranceExamId) {
          params.append("entranceExamId", filterEntranceExamId);
        }
        if (filterSubjectId) {
          params.append("subjectId", filterSubjectId);
        }

        const response = await axiosInstance.get(
          `/question/by-creator/${userId}?${params.toString()}`
        );

        if (response.data?.success) {
          setQuestions(response.data.data || []);
          setPagination(response.data.pagination || null);
          setCurrentPage(page);
        } else {
          // Handle case where response structure is different
          setQuestions(response.data?.data || response.data || []);
          setPagination(response.data?.pagination || null);
        }
      } catch (error) {
        console.error("Failed to fetch questions:", error);
        setQuestions([]);
        setPagination(null);
      } finally {
        setLoadingQuestions(false);
      }
    },
    [authUser?.id, authUser?._id, filterEntranceExamId, filterSubjectId]
  );

  // Fetch questions when switching to "My Questions" tab
  useEffect(() => {
    const userId = authUser?.id || authUser?._id;
    if (activeTab === "my-questions" && userId) {
      fetchQuestions(1);
    }
  }, [activeTab, fetchQuestions, authUser?.id, authUser?._id]);

  // Handle filter changes
  const handleFilterEntranceExamChange = (examId: string) => {
    setFilterEntranceExamId(examId);
    setFilterSubjectId(""); // Reset subject when exam changes
  };

  const handleFilterSubjectChange = (subjectId: string) => {
    setFilterSubjectId(subjectId);
  };

  const handleResetFilters = () => {
    setFilterEntranceExamId("");
    setFilterSubjectId("");
  };

  const handleGenerate = async () => {
    if (!selectedSubject) {
      setStatus({
        type: "error",
        message: "Please select a subject",
      });
      return;
    }

    if (!selectedEntranceExamId) {
      setStatus({
        type: "error",
        message: "Please select an entrance exam",
      });
      return;
    }

    setGenerating(true);
    setStatus({ type: null, message: "" });

    try {
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === selectedEntranceExamId ||
          exam._id === selectedEntranceExamId
      );
      const examId = selectedExam?.entranceExamId || selectedEntranceExamId;

      // If PDF is provided, upload it first
      if (selectedFile) {
        // Step 1: Get presigned URL
        const presignedResponse = await axiosInstance.post(
          "/upload/presigned-url",
          {
            fileName: selectedFile.name,
            contentType: selectedFile.type,
          }
        );

        const { url, key } = presignedResponse.data;

        // Step 2: Upload file to S3 using presigned URL
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: selectedFile,
          headers: {
            "Content-Type": selectedFile.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Step 3: Generate questions from PDF
        const tagResponse = await axiosInstance.post("/upload/tag", {
          fileName: selectedFile.name,
          key,
          subjectId: selectedSubject,
          entranceExamId: examId,
          numQuestions: numQuestions > 0 ? numQuestions : undefined,
        });

        let successMessage = "Questions generated from PDF successfully!";
        if (tagResponse.data.questionsGenerated) {
          successMessage += ` ${tagResponse.data.questionsGenerated} questions created.`;
        }

        setStatus({
          type: "success",
          message: successMessage,
        });
      } else {
        // Generate questions directly without PDF
        const response = await axiosInstance.post("/upload/generate-direct", {
          entranceExamId: examId,
          subjectId: selectedSubject,
          topic: topic || undefined,
          numQuestions: numQuestions > 0 ? numQuestions : 50,
        });

        setStatus({
          type: "success",
          message: `${
            response.data.questionsGenerated || numQuestions
          } questions generated successfully!`,
        });
      }

      // Reset form
      setSelectedFile(null);
      setSelectedSubject("");
      setSelectedEntranceExamId("");
      setTopic("");
      setNumQuestions(50);
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }

      // Refresh questions list if on "My Questions" tab
      if (activeTab === "my-questions") {
        fetchQuestions(1);
      }
    } catch (error: unknown) {
      console.error("Generation error:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : undefined;
      setStatus({
        type: "error",
        message: errorMessage || "Failed to generate questions",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="generate"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md"
          >
            Generate Questions
          </TabsTrigger>
          <TabsTrigger
            value="my-questions"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md"
          >
            My Questions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Questions</CardTitle>
              <CardDescription>
                Generate questions by uploading a PDF or by selecting entrance
                exam, subject, and optional topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Entrance Exam - Required */}
              <div className="space-y-2">
                <Label htmlFor="entrance-exam">
                  Entrance Exam <span className="text-red-500">*</span>
                </Label>
                <select
                  id="entrance-exam"
                  value={selectedEntranceExamId}
                  onChange={(e) => handleEntranceExamChange(e.target.value)}
                  disabled={loadingExams}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {loadingExams
                      ? "Loading exams..."
                      : "Select an entrance exam"}
                  </option>
                  {entranceExams.map((exam) => (
                    <option key={exam._id} value={exam.entranceExamId}>
                      {exam.entranceExamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject - Required */}
              <div className="space-y-2">
                <Label htmlFor="subject">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <select
                  id="subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={
                    !selectedEntranceExamId || filteredSubjects.length === 0
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {selectedEntranceExamId
                      ? filteredSubjects.length > 0
                        ? "Select a subject"
                        : "No subjects available"
                      : "Select an entrance exam first"}
                  </option>
                  {filteredSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Topic - Optional */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic (Optional)</Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., Differential Calculus, Organic Chemistry"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Specify a topic to focus the questions on a specific area
                </p>
              </div>

              {/* PDF Upload - Optional */}
              <div className="space-y-2">
                <Label htmlFor="file-input">PDF File (Optional)</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Upload a PDF to generate questions based on its content
                </p>
              </div>

              {/* Number of Questions */}
              <div className="space-y-2">
                <Label htmlFor="num-questions">Number of Questions</Label>
                <Input
                  id="num-questions"
                  type="number"
                  min="1"
                  max="100"
                  value={numQuestions}
                  onChange={(e) =>
                    setNumQuestions(parseInt(e.target.value) || 50)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Default: 50 questions (max: 100)
                </p>
              </div>

              {/* Status Messages */}
              {status.type && (
                <div
                  className={`p-3 rounded-md ${
                    status.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {status.message}
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={
                  generating || !selectedSubject || !selectedEntranceExamId
                }
                className="w-full"
              >
                {generating ? "Generating..." : "Generate Questions"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-questions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>My Questions</CardTitle>
              <CardDescription>
                View all questions you have generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Filter Section */}
              <QuestionsFilter
                selectedEntranceExamId={filterEntranceExamId}
                selectedSubjectId={filterSubjectId}
                onEntranceExamChange={handleFilterEntranceExamChange}
                onSubjectChange={handleFilterSubjectChange}
                onReset={handleResetFilters}
                loadingExams={false}
              />

              {/* Questions Count */}
              {pagination && (
                <div className="text-sm text-muted-foreground">
                  Showing {questions.length} of {pagination.totalCount}{" "}
                  questions
                </div>
              )}

              {/* Scrollable Questions List Container */}
              <div className="max-h-[800px] overflow-y-auto pr-2 border rounded-md p-4 bg-muted/20">
                <QuestionsList
                  questions={questions}
                  loading={loadingQuestions}
                  onQuestionUpdated={() => fetchQuestions(currentPage)}
                  onQuestionDeleted={() => fetchQuestions(currentPage)}
                />
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchQuestions(currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchQuestions(currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
