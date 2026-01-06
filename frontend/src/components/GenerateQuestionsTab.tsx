import { useState, useEffect } from "react";
import { axiosInstance } from "../lib/axio";
import {
  getAllEntranceExams,
  getSubjectNamesFromExam,
  type EntranceExam,
} from "../lib/entranceExams";

interface UploadQuota {
  success: boolean;
  canUploadPdf: boolean;
  hasUploadedPdfBefore: boolean;
  pdfUploadDate: string | null;
  canGenerateQuestions: boolean;
  questionsGeneratedInPeriod: number;
  questionsRemaining: number;
  nextResetDate: string | null;
  periodStartDate: string | null;
  cooldownDays: number;
  maxSizeMB: number;
  maxPages: number;
  maxQuestions: number;
  maxQuestionsPerPeriod: number;
}

export default function GenerateQuestionsTab() {
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(50);
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Fetch upload quota and entrance exams on mount
  useEffect(() => {
    fetchQuota();
    fetchExams();
  }, []);

  // Update filtered subjects when exam selection changes
  useEffect(() => {
    if (selectedExam) {
      const selectedExamData = entranceExams.find(
        (exam) =>
          exam.entranceExamId === selectedExam || exam._id === selectedExam
      );
      if (selectedExamData) {
        const subjectNames = getSubjectNamesFromExam(selectedExamData);
        setFilteredSubjects(subjectNames);
      } else {
        setFilteredSubjects([]);
      }
      setSelectedSubject(""); // Reset subject when exam changes
    } else {
      setFilteredSubjects([]);
      setSelectedSubject("");
    }
  }, [selectedExam, entranceExams]);

  const fetchQuota = async () => {
    try {
      setLoadingQuota(true);
      const response = await axiosInstance.get("/user/upload/check-quota");
      setQuota(response.data);
    } catch (error) {
      console.error("Failed to fetch quota:", error);
      setStatus({
        type: "error",
        message: "Failed to load upload quota. Please try again.",
      });
    } finally {
      setLoadingQuota(false);
    }
  };

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

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (quota && fileSizeMB > quota.maxSizeMB) {
        setStatus({
          type: "error",
          message: `File size (${fileSizeMB.toFixed(
            2
          )}MB) exceeds maximum allowed size of ${quota.maxSizeMB}MB`,
        });
        return;
      }

      setSelectedFile(file);
      setTopic(""); // Clear topic when PDF is selected
      setStatus({ type: null, message: "" });
    }
  };

  const handleGenerate = async () => {
    if (!selectedSubject) {
      setStatus({
        type: "error",
        message: "Please select a subject",
      });
      return;
    }

    if (!selectedExam) {
      setStatus({
        type: "error",
        message: "Please select an entrance exam",
      });
      return;
    }

    // Check if PDF upload is allowed (can only upload once)
    if (selectedFile && !quota?.canUploadPdf) {
      setStatus({
        type: "error",
        message: "PDF upload limit reached. You can only upload a PDF once.",
      });
      return;
    }

    // Check if question generation is allowed (max 50 per 15 days)
    if (!quota?.canGenerateQuestions) {
      setStatus({
        type: "error",
        message: `Question generation limit reached. You have generated ${
          quota?.questionsGeneratedInPeriod || 0
        } questions in the last ${
          quota?.cooldownDays || 15
        } days. Maximum allowed is ${
          quota?.maxQuestionsPerPeriod || 50
        } questions per ${quota?.cooldownDays || 15} days.`,
      });
      return;
    }

    setGenerating(true);
    setStatus({ type: null, message: "" });

    // Ensure numQuestions doesn't exceed 50
    const finalNumQuestions = Math.min(
      numQuestions > 0 ? numQuestions : 50,
      50
    );

    try {
      if (selectedFile) {
        const presignedResponse = await axiosInstance.post(
          "/user/upload/presigned-url",
          {
            fileName: selectedFile.name,
            contentType: selectedFile.type,
          }
        );

        const { url, key } = presignedResponse.data;

        // Step 2: Upload file to storage
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
        const tagResponse = await axiosInstance.post("/user/upload/tag", {
          fileName: selectedFile.name,
          key,
          subjectId: selectedSubject, // Subject name
          entranceExamId: selectedExam, // Exam ID
        });

        setStatus({
          type: "success",
          message: `PDF uploaded successfully! ${tagResponse.data.questionsGenerated} questions generated. You can only upload a PDF once.`,
        });
      } else {
        // Generate questions directly without PDF
        const response = await axiosInstance.post(
          "/user/upload/generate-direct",
          {
            entranceExamId: selectedExam, // Exam ID
            subjectId: selectedSubject, // Subject name
            topic: topic || undefined,
            numQuestions: finalNumQuestions,
          }
        );

        setStatus({
          type: "success",
          message: `${
            response.data.questionsGenerated || numQuestions
          } questions generated successfully!`,
        });
      }

      // Reset form and refresh quota
      setSelectedFile(null);
      setSelectedSubject("");
      setSelectedExam("");
      setTopic("");
      setNumQuestions(50);
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      await fetchQuota();
    } catch (error: unknown) {
      console.error("Generation error:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to generate questions";
      setStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setGenerating(false);
    }
  };

  const getDaysRemaining = () => {
    if (!quota?.nextResetDate) return null;
    const next = new Date(quota.nextResetDate);
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loadingQuota || loadingExams) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Generate Questions</h1>
      <p className="text-gray-600 mb-6">
        Generate questions by uploading a PDF or by selecting entrance exam,
        subject, and optional topic
      </p>

      {/* PDF Upload Status */}
      {quota?.hasUploadedPdfBefore && (
        <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-200">
          <h3 className="font-semibold mb-2 text-yellow-800">
            ⚠️ PDF Upload Limit Reached
          </h3>
          <p className="text-sm text-yellow-700">
            You have already uploaded a PDF. PDF upload is only allowed once.
            You can still generate questions directly without uploading a PDF.
          </p>
          {quota.pdfUploadDate && (
            <p className="text-xs text-yellow-600 mt-1">
              PDF uploaded on:{" "}
              {new Date(quota.pdfUploadDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Question Generation Status */}
      <div
        className={`mb-6 p-4 rounded-md ${
          quota?.canGenerateQuestions
            ? "bg-green-50 border border-green-200"
            : "bg-red-50 border border-red-200"
        }`}
      >
        <h3 className="font-semibold mb-2">
          {quota?.canGenerateQuestions
            ? "✓ Question Generation Available"
            : "⏳ Question Generation Limit Reached"}
        </h3>
        {quota?.canGenerateQuestions ? (
          <div className="text-sm text-gray-700">
            <p className="mb-1">
              You can generate <strong>{quota.questionsRemaining}</strong> more
              questions in this period.
            </p>
            <p className="text-xs text-gray-500">
              Generated: {quota.questionsGeneratedInPeriod} /{" "}
              {quota.maxQuestionsPerPeriod} questions (last {quota.cooldownDays}{" "}
              days)
            </p>
          </div>
        ) : (
          <div className="text-sm text-gray-700">
            <p className="mb-1">
              You have reached the limit of{" "}
              <strong>
                {quota?.maxQuestionsPerPeriod || 50} questions per{" "}
                {quota?.cooldownDays || 15} days
              </strong>
              .
            </p>
            {daysRemaining !== null && (
              <p className="mb-1">
                You can generate questions again in{" "}
                <strong>{daysRemaining} days</strong>
              </p>
            )}
            <p className="text-xs text-gray-500">
              Next reset:{" "}
              {quota?.nextResetDate
                ? new Date(quota.nextResetDate).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        )}
      </div>

      {/* Upload Limits */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="font-semibold mb-2">Limits</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            • PDF upload: <strong>Once only</strong> (cannot upload again after
            first upload)
          </li>
          <li>• Maximum file size: {quota?.maxSizeMB}MB</li>
          <li>• Maximum pages: {quota?.maxPages}</li>
          <li>
            • Maximum questions per generation: <strong>50 questions</strong>
          </li>
          <li>
            • Question generation limit:{" "}
            <strong>
              {quota?.maxQuestionsPerPeriod} questions per {quota?.cooldownDays}{" "}
              days
            </strong>
          </li>
        </ul>
      </div>

      {/* Upload Form */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="exam"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Entrance Exam <span className="text-red-500">*</span>
          </label>
          <select
            id="exam"
            value={selectedExam}
            onChange={(e) => setSelectedExam(e.target.value)}
            disabled={!quota?.canGenerateQuestions || generating}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">Select an entrance exam</option>
            {entranceExams.map((exam) => (
              <option key={exam._id} value={exam.entranceExamId}>
                {exam.entranceExamName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Subject <span className="text-red-500">*</span>
          </label>
          <select
            id="subject"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            disabled={
              !quota?.canGenerateQuestions || generating || !selectedExam
            }
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            <option value="">
              {selectedExam
                ? "Select a subject"
                : "Select an entrance exam first"}
            </option>
            {filteredSubjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
          {selectedExam && filteredSubjects.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No subjects found for this exam
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="topic"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Topic (Optional)
          </label>
          <input
            id="topic"
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={
              selectedFile
                ? "Not available with PDF upload"
                : "e.g., Differential Calculus, Organic Chemistry"
            }
            disabled={
              !quota?.canGenerateQuestions ||
              generating ||
              selectedFile !== null
            }
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            {selectedFile
              ? "Topic is only available for direct question generation without PDF"
              : "Specify a topic to focus the questions on a specific area (only for direct generation)"}
          </p>
        </div>

        <div>
          <label
            htmlFor="file-input"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            PDF File (Optional)
          </label>
          <input
            id="file-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            disabled={
              !quota?.canUploadPdf || !quota?.canGenerateQuestions || generating
            }
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
          />
          {!quota?.canUploadPdf && (
            <p className="text-xs text-red-500 mt-1">
              PDF upload is not available. You can only upload a PDF once.
            </p>
          )}
          {selectedFile && (
            <p className="text-sm text-gray-600 mt-2">
              Selected: {selectedFile.name} (
              {(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Upload a PDF to generate questions based on its content
          </p>
        </div>

        <div>
          <label
            htmlFor="num-questions"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Number of Questions
          </label>
          <input
            id="num-questions"
            type="number"
            min="1"
            max={
              quota?.questionsRemaining
                ? Math.min(50, quota.questionsRemaining)
                : 50
            }
            value={numQuestions}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 50;
              const maxAllowed = quota?.questionsRemaining
                ? Math.min(50, quota.questionsRemaining)
                : 50;
              setNumQuestions(Math.min(value, maxAllowed));
            }}
            disabled={!quota?.canGenerateQuestions || generating}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            Default: 50 questions (max:{" "}
            {quota?.questionsRemaining
              ? Math.min(50, quota.questionsRemaining)
              : 50}{" "}
            remaining)
          </p>
        </div>

        {status.type && (
          <div
            className={`p-3 rounded-md ${
              status.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {status.message}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={
            !quota?.canGenerateQuestions ||
            generating ||
            !selectedSubject ||
            !selectedExam
          }
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {generating ? "Generating..." : "Generate Questions"}
        </button>
      </div>
    </div>
  );
}
