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
import QuestionsList, { type Question } from "@/components/QuestionsList";
import QuestionsFilter from "@/components/QuestionsFilter";
import QuestionPagination from "@/components/QuestionPagination";
import { Search } from "lucide-react";

interface Pagination {
  currentPage: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ActiveQuestionJob {
  externalJobId?: string;
  status?: string;
  subjectId?: string | null;
  subjectName?: string | null;
  entranceExamId?: string | null;
  entranceExamName?: string | null;
}

interface QuestionJob extends ActiveQuestionJob {
  id?: string;
  requestedQuestions?: number;
  generatedQuestions?: number;
  createdAt?: string;
  completedAt?: string | null;
  timeTaken?: string | null;
}

export default function Questions() {
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
  const [uploadDocxFile, setUploadDocxFile] = useState<File | null>(null);
  const [uploadDocxExamId, setUploadDocxExamId] = useState<string>("");
  const [uploadDocxSubject, setUploadDocxSubject] = useState<string>("");
  const [uploadDocxSubjects, setUploadDocxSubjects] = useState<string[]>([]);
  const [uploadingDocx, setUploadingDocx] = useState(false);
  const [uploadDocxStatus, setUploadDocxStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isJobRunning, setIsJobRunning] = useState(false);
  const [activeQuestionJobs, setActiveQuestionJobs] = useState<
    ActiveQuestionJob[]
  >([]);

  // My Questions tab state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // Filter state for "My Questions" tab
  const [filterEntranceExamId, setFilterEntranceExamId] = useState<string>("");
  const [filterSubjectId, setFilterSubjectId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Recent jobs state
  const [recentJobs, setRecentJobs] = useState<QuestionJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const fetchRecentJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const response = await axiosInstance.get(
        "/admin/jobs?type=question-generation&limit=30",
      );
      const jobs = (response.data?.jobs || []) as QuestionJob[];
      setRecentJobs(jobs);
    } catch (error) {
      console.error("Failed to fetch recent jobs:", error);
      setRecentJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const checkActiveJob = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        "/admin/jobs/active?type=question-generation",
      );
      const jobs = (response.data?.jobs || []) as ActiveQuestionJob[];
      const runningStatuses = ["queued", "running", "partial"];
      const runningJobs = jobs.filter(
        (job) => !!job.status && runningStatuses.includes(job.status),
      );

      setActiveQuestionJobs(runningJobs);

      if (!runningJobs.length) {
        setActiveJobId(null);
        setIsJobRunning(false);
        return;
      }

      const job = runningJobs[0];
      const nextJobId = job.externalJobId || null;

      setActiveJobId(nextJobId);
      setIsJobRunning(!!nextJobId);
    } catch (error) {
      console.error("Failed to check active jobs:", error);
      setActiveQuestionJobs([]);
      setActiveJobId(null);
      setIsJobRunning(false);
    }
  }, []);

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

  useEffect(() => {
    checkActiveJob();
    fetchRecentJobs();
  }, [checkActiveJob, fetchRecentJobs]);

  useEffect(() => {
    if (!activeJobId) {
      return;
    }

    const runningStatuses = ["queued", "running", "partial"];

    const pollJobStatus = async () => {
      try {
        const response = await axiosInstance.get(
          `/admin/jobs/${activeJobId}/status`,
        );
        const job = response.data?.job as { status?: string } | undefined;

        if (!job?.status || !runningStatuses.includes(job.status)) {
          await checkActiveJob();
          return;
        }

        setIsJobRunning(true);
      } catch (error) {
        console.error("Failed to poll job status:", error);
        await checkActiveJob();
      }
    };

    pollJobStatus();
    const intervalId = window.setInterval(pollJobStatus, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeJobId, activeTab, checkActiveJob]);

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

  useEffect(() => {
    if (uploadDocxExamId) {
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === uploadDocxExamId ||
          exam._id === uploadDocxExamId,
      );
      if (selectedExam) {
        setUploadDocxSubjects(getSubjectNamesFromExam(selectedExam));
      } else {
        setUploadDocxSubjects([]);
      }
      setUploadDocxSubject("");
    } else {
      setUploadDocxSubjects([]);
      setUploadDocxSubject("");
    }
  }, [uploadDocxExamId, entranceExams]);

  const handleEntranceExamChange = (examId: string) => {
    setSelectedEntranceExamId(examId);
    setSelectedSubject(""); // Reset subject when exam changes
  };

  const handleDocxFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".docx")) {
        setUploadDocxStatus({
          type: "error",
          message: "Please select a .docx file",
        });
        return;
      }
      setUploadDocxFile(file);
      setUploadDocxStatus({ type: null, message: "" });
    }
  };

  const handleUploadDocx = async () => {
    if (!uploadDocxSubject || !uploadDocxExamId) {
      setUploadDocxStatus({
        type: "error",
        message: "Please select entrance exam and subject",
      });
      return;
    }

    if (!uploadDocxFile) {
      setUploadDocxStatus({
        type: "error",
        message: "Please select a DOCX file",
      });
      return;
    }

    setUploadingDocx(true);
    setUploadDocxStatus({ type: null, message: "" });

    try {
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === uploadDocxExamId ||
          exam._id === uploadDocxExamId,
      );
      const examId = selectedExam?.entranceExamId || uploadDocxExamId;

      const formData = new FormData();
      formData.append("file", uploadDocxFile);
      formData.append("entranceExamId", examId);
      formData.append("subjectId", uploadDocxSubject);

      const response = await axiosInstance.post(
        "/upload/docx/questions",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const queuedJobId = response.data?.jobId;
      if (queuedJobId) {
        setActiveJobId(String(queuedJobId));
        setIsJobRunning(true);
      }

      setUploadDocxStatus({
        type: "success",
        message:
          "Upload successful! We're extracting your questions now — this usually takes 1–3 minutes (larger files may take a little longer). Check the History tab for progress, or open My Questions in a few minutes to see them.",
      });

      setUploadDocxFile(null);
      setUploadDocxSubject("");
      setUploadDocxExamId("");
      const docxInput = document.getElementById(
        "docx-file-input",
      ) as HTMLInputElement;
      if (docxInput) {
        docxInput.value = "";
      }

      await checkActiveJob();
      await fetchRecentJobs();
    } catch (error: unknown) {
      console.error("DOCX upload error:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : undefined;
      setUploadDocxStatus({
        type: "error",
        message: errorMessage || "Failed to upload DOCX",
      });
    } finally {
      setUploadingDocx(false);
    }
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
        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const response = await axiosInstance.get(
          `/question/by-creator?${params.toString()}`
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
    [filterEntranceExamId, filterSubjectId, debouncedSearch],
  );

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 400);

    return () => window.clearTimeout(timerId);
  }, [searchQuery]);

  useEffect(() => {
    if (activeTab === "my-questions") {
      fetchQuestions(1);
    }
  }, [activeTab, fetchQuestions]);

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
    setSearchQuery("");
    setDebouncedSearch("");
  };

  const selectedEntranceExam = entranceExams.find(
    (exam) =>
      exam.entranceExamId === selectedEntranceExamId ||
      exam._id === selectedEntranceExamId,
  );

  const normalizeValue = (value?: string | null) =>
    (value || "").trim().toLowerCase();

  const isSelectedCombinationRunning =
    !!selectedSubject &&
    !!selectedEntranceExamId &&
    activeQuestionJobs.some((job) => {
      const sameSubject =
        normalizeValue(job.subjectName) === normalizeValue(selectedSubject);

      const sameExamById =
        !!selectedEntranceExam &&
        [
          normalizeValue(selectedEntranceExam._id),
          normalizeValue(selectedEntranceExam.entranceExamId),
          normalizeValue(selectedEntranceExamId),
        ].includes(normalizeValue(job.entranceExamId));

      const sameExamByName =
        !!selectedEntranceExam &&
        normalizeValue(job.entranceExamName) ===
        normalizeValue(selectedEntranceExam.entranceExamName);

      return sameSubject && (sameExamById || sameExamByName);
    });

  const blockedCombinationJob = isSelectedCombinationRunning
    ? activeQuestionJobs.find((job) => {
      const sameSubject =
        normalizeValue(job.subjectName) === normalizeValue(selectedSubject);
      const sameExamById =
        !!selectedEntranceExam &&
        [
          normalizeValue(selectedEntranceExam._id),
          normalizeValue(selectedEntranceExam.entranceExamId),
          normalizeValue(selectedEntranceExamId),
        ].includes(normalizeValue(job.entranceExamId));
      const sameExamByName =
        !!selectedEntranceExam &&
        normalizeValue(job.entranceExamName) ===
        normalizeValue(selectedEntranceExam.entranceExamName);

      return sameSubject && (sameExamById || sameExamByName);
    })
    : null;

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

    if (isSelectedCombinationRunning) {
      setStatus({
        type: "error",
        message:
          "Questions for this entrance exam + subject are already being generated. Please wait until it completes.",
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

        const queuedJobId = tagResponse.data?.jobId;
        if (queuedJobId) {
          setActiveJobId(String(queuedJobId));
          setIsJobRunning(true);
        }

        setStatus({
          type: "success",
          message: "Question generation queued successfully.",
        });
      } else {
        // Generate questions directly without PDF
        const response = await axiosInstance.post("/upload/generate-direct", {
          entranceExamId: examId,
          subjectId: selectedSubject,
          topic: topic || undefined,
          numQuestions: numQuestions > 0 ? numQuestions : 50,
        });

        const queuedJobId = response.data?.jobId;
        if (queuedJobId) {
          setActiveJobId(String(queuedJobId));
          setIsJobRunning(true);
        }

        setStatus({
          type: "success",
          message: "Question generation queued successfully.",
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

      await checkActiveJob();
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
    <div className="container mx-auto p-6 max-w-7xl w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-12 p-1">
          <TabsTrigger
            value="generate"
            className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md py-2.5"
          >
            Generate Questions
          </TabsTrigger>
          <TabsTrigger
            value="my-questions"
            className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md py-2.5"
          >
            My Questions
          </TabsTrigger>
          <TabsTrigger
            value="upload"
            className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md py-2.5"
          >
            Upload Questions
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-semibold data-[state=active]:shadow-md py-2.5"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Generate Questions</CardTitle>
              <CardDescription className="text-base">
                Generate questions by uploading a PDF or by selecting entrance
                exam, subject, and optional topic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-base">
              {/* Entrance Exam - Required */}
              <div className="space-y-2">
                <Label htmlFor="entrance-exam" className="text-base">
                  Entrance Exam <span className="text-red-500">*</span>
                </Label>
                <select
                  id="entrance-exam"
                  value={selectedEntranceExamId}
                  onChange={(e) => handleEntranceExamChange(e.target.value)}
                  disabled={loadingExams}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                <Label htmlFor="subject" className="text-base">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <select
                  id="subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  disabled={
                    !selectedEntranceExamId || filteredSubjects.length === 0
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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
                <Label htmlFor="topic" className="text-base">Topic (Optional)</Label>
                <Input
                  id="topic"
                  type="text"
                  placeholder="e.g., Differential Calculus, Organic Chemistry"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-10 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Specify a topic to focus the questions on a specific area
                </p>
              </div>

              {/* PDF Upload - Optional */}
              <div className="space-y-2">
                <Label htmlFor="file-input" className="text-base">PDF File (Optional)</Label>
                <Input
                  id="file-input"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="text-base"
                />
                {selectedFile && (
                  <p className="text-base text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Upload a PDF to generate questions based on its content
                </p>
              </div>

              {/* Number of Questions */}
              <div className="space-y-2">
                <Label htmlFor="num-questions" className="text-base">Number of Questions</Label>
                <Input
                  id="num-questions"
                  type="number"
                  min="1"
                  max="100"
                  value={numQuestions}
                  onChange={(e) =>
                    setNumQuestions(parseInt(e.target.value) || 50)
                  }
                  className="h-10 text-base"
                />
                <p className="text-sm text-muted-foreground">
                  Approx time reference: 200 questions can take around 3-5 minutes.
                </p>
              </div>

              {/* Status Messages */}
              {status.type && (
                <div
                  className={`p-4 rounded-md text-base ${status.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                    }`}
                >
                  {status.message}
                </div>
              )}

              {isJobRunning && (
                <p className="text-base text-muted-foreground">
                  Questions are Being generated right now in background come back after few minutes or hours...
                </p>
              )}

              {isSelectedCombinationRunning && (
                <p className="text-base text-amber-700">
                  This combination is already in queue/running: {selectedEntranceExam?.entranceExamName || "Selected exam"} + {selectedSubject}
                  {blockedCombinationJob?.externalJobId
                    ? ` (Job #${blockedCombinationJob.externalJobId})`
                    : ""}
                  . You can choose another subject or exam and queue that instead.
                </p>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={
                  generating ||
                  !selectedSubject ||
                  !selectedEntranceExamId ||
                  isSelectedCombinationRunning
                }
                className="w-full"
              >
                {generating ? "Generating..." : "Generate Questions"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Upload Questions</CardTitle>
              <CardDescription className="text-base">
                Upload a DOCX file with numbered MCQs and an Answer Key section
                at the end. Questions are imported into the selected exam and
                subject.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-base">
              <div className="space-y-2">
                <Label htmlFor="upload-docx-exam" className="text-base">
                  Entrance Exam <span className="text-red-500">*</span>
                </Label>
                <select
                  id="upload-docx-exam"
                  value={uploadDocxExamId}
                  onChange={(e) => setUploadDocxExamId(e.target.value)}
                  disabled={loadingExams}
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

              <div className="space-y-2">
                <Label htmlFor="upload-docx-subject" className="text-base">
                  Subject <span className="text-red-500">*</span>
                </Label>
                <select
                  id="upload-docx-subject"
                  value={uploadDocxSubject}
                  onChange={(e) => setUploadDocxSubject(e.target.value)}
                  disabled={
                    !uploadDocxExamId || uploadDocxSubjects.length === 0
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {uploadDocxExamId
                      ? uploadDocxSubjects.length > 0
                        ? "Select a subject"
                        : "No subjects available"
                      : "Select an entrance exam first"}
                  </option>
                  {uploadDocxSubjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="docx-file-input" className="text-base">
                  DOCX File <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="docx-file-input"
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleDocxFileChange}
                  className="text-base"
                />
                {uploadDocxFile && (
                  <p className="text-base text-muted-foreground">
                    Selected: {uploadDocxFile.name}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Format: numbered questions (1. ...), options A–D on separate
                  lines, then an &quot;Answer Key&quot; section (e.g. 1. B, 2. C).
                </p>
              </div>

              {uploadDocxStatus.type && (
                <div
                  className={`p-4 rounded-md text-base ${
                    uploadDocxStatus.type === "success"
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  {uploadDocxStatus.message}
                </div>
              )}

              {isJobRunning && (
                <p className="text-base text-muted-foreground">
                  Import in progress — questions are usually ready within a few
                  minutes. Check the History tab for status.
                </p>
              )}

              <Button
                onClick={handleUploadDocx}
                disabled={
                  uploadingDocx ||
                  !uploadDocxFile ||
                  !uploadDocxSubject ||
                  !uploadDocxExamId
                }
                className="w-full"
              >
                {uploadingDocx ? "Uploading..." : "Upload & Import Questions"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-questions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">My Questions</CardTitle>
              <CardDescription className="text-base">
                View all questions you have generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-base">
              {/* Filter Section */}
              <QuestionsFilter
                selectedEntranceExamId={filterEntranceExamId}
                selectedSubjectId={filterSubjectId}
                onEntranceExamChange={handleFilterEntranceExamChange}
                onSubjectChange={handleFilterSubjectChange}
                onReset={handleResetFilters}
                loadingExams={false}
              />

              <div className="space-y-2">
                <Label htmlFor="question-search" className="text-base">
                  Search questions
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="question-search"
                    type="search"
                    placeholder="Search by question text or option…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-9 text-base"
                  />
                </div>
              </div>

              {/* Questions Count */}
              {pagination && (
                <div className="text-base text-muted-foreground">
                  Showing {questions.length} of {pagination.totalCount}{" "}
                  questions
                </div>
              )}

              {pagination && pagination.totalPages > 1 && (
                <QuestionPagination
                  placement="top"
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={fetchQuestions}
                  disabled={loadingQuestions}
                />
              )}

              {/* Scrollable Questions List Container */}
              <div className="max-h-[70vh] overflow-y-auto pr-2 border rounded-md p-5 bg-muted/20">
                <QuestionsList
                  questions={questions}
                  loading={loadingQuestions}
                  onQuestionUpdated={() => fetchQuestions(currentPage)}
                  onQuestionDeleted={() => fetchQuestions(currentPage)}
                  currentPage={currentPage}
                  limit={pagination?.limit || 20}
                  selectedQuestionIds={selectedQuestionIds}
                  onSelectionChange={setSelectedQuestionIds}
                />
              </div>

              {pagination && pagination.totalPages > 1 && (
                <QuestionPagination
                  placement="bottom"
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={fetchQuestions}
                  disabled={loadingQuestions}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Generation History</CardTitle>
              <CardDescription className="text-base">
                See the status of your recent question generation jobs.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-base">
              <p className="text-sm text-muted-foreground">
                This list shows your most recent question generation jobs. You can stay on this page and we&apos;ll update the status automatically.
              </p>
              <div className="max-h-[70vh] overflow-y-auto border rounded-md bg-muted/30">
                {loadingJobs ? (
                  <div className="p-5 text-base text-muted-foreground">
                    Loading jobs...
                  </div>
                ) : recentJobs.length === 0 ? (
                  <div className="p-5 text-base text-muted-foreground">
                    You haven&apos;t generated any questions yet.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60">
                      <tr className="text-left">
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Exam</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3 text-center">Requested</th>
                        <th className="px-4 py-3 text-center">Generated</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentJobs.map((job) => {
                        const statusLabel =
                          job.status === "completed"
                            ? "Completed"
                            : job.status === "failed"
                            ? "Failed"
                            : job.status === "queued" ||
                              job.status === "running" ||
                              job.status === "partial"
                            ? "In progress"
                            : job.status || "Unknown";

                        const statusClass =
                          job.status === "completed"
                            ? "bg-green-50 text-green-800 border-green-200"
                            : job.status === "failed"
                            ? "bg-red-50 text-red-800 border-red-200"
                            : "bg-amber-50 text-amber-800 border-amber-200";

                        const createdAt = job.createdAt
                          ? new Date(job.createdAt)
                          : null;

                        return (
                          <tr key={job.externalJobId || job.id}>
                            <td className="px-4 py-3 align-top">
                              {createdAt ? createdAt.toLocaleString() : "-"}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {job.entranceExamName || "-"}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {job.subjectName || "-"}
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              {job.requestedQuestions ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              {job.generatedQuestions ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-center align-top">
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass}`}
                              >
                                {statusLabel}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
