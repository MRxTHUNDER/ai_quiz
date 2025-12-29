import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface UploadQuota {
  canUpload: boolean;
  nextUploadDate: string | null;
  lastUploadDate: string | null;
  cooldownDays: number;
  maxSizeMB: number;
  maxPages: number;
  maxQuestions: number;
}

export default function UploadPdf() {
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [loadingQuota, setLoadingQuota] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Fetch upload quota on mount
  useEffect(() => {
    fetchQuota();
  }, []);

  const fetchQuota = async () => {
    try {
      setLoadingQuota(true);
      const response = await axios.get(`${API_URL}/user/upload/check-quota`, {
        withCredentials: true,
      });
      setQuota(response.data);
    } catch (error) {
      console.error("Failed to fetch quota:", error);
      setUploadStatus({
        type: "error",
        message: "Failed to load upload quota. Please try again.",
      });
    } finally {
      setLoadingQuota(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setUploadStatus({
          type: "error",
          message: "Please select a PDF file",
        });
        return;
      }

      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (quota && fileSizeMB > quota.maxSizeMB) {
        setUploadStatus({
          type: "error",
          message: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size of ${quota.maxSizeMB}MB`,
        });
        return;
      }

      setSelectedFile(file);
      setUploadStatus({ type: null, message: "" });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({
        type: "error",
        message: "Please select a file",
      });
      return;
    }

    if (!selectedSubject) {
      setUploadStatus({
        type: "error",
        message: "Please enter a subject name",
      });
      return;
    }

    if (!selectedExam) {
      setUploadStatus({
        type: "error",
        message: "Please select an entrance exam",
      });
      return;
    }

    if (!quota?.canUpload) {
      setUploadStatus({
        type: "error",
        message: "Upload quota exceeded. Please wait for the cooldown period.",
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
      // Step 1: Get presigned URL
      const presignedResponse = await axios.post(
        `${API_URL}/user/upload/presigned-url`,
        {
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        },
        { withCredentials: true }
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

      // Step 3: Tag the PDF
      const tagResponse = await axios.post(
        `${API_URL}/user/upload/tag`,
        {
          fileName: selectedFile.name,
          key,
          subjectId: selectedSubject,
          entranceExamId: selectedExam,
        },
        { withCredentials: true }
      );

      setUploadStatus({
        type: "success",
        message: `PDF uploaded successfully! ${tagResponse.data.questionsGenerated} questions generated. You can upload again after ${quota.cooldownDays} days.`,
      });

      // Reset form and refresh quota
      setSelectedFile(null);
      setSelectedSubject("");
      setSelectedExam("");
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      await fetchQuota();
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage =
        error?.response?.data?.message || "Failed to upload PDF";
      setUploadStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setUploading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!quota?.nextUploadDate) return null;
    const next = new Date(quota.nextUploadDate);
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loadingQuota) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining();

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2">Upload Your PDF</h1>
        <p className="text-gray-600 mb-6">
          Upload a PDF and generate {quota?.maxQuestions} questions automatically
        </p>

        {/* Quota Status */}
        <div className={`mb-6 p-4 rounded-md ${quota?.canUpload ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <h3 className="font-semibold mb-2">
            {quota?.canUpload ? "✓ Upload Available" : "⏳ Upload Limit Reached"}
          </h3>
          {quota?.canUpload ? (
            <p className="text-sm text-gray-700">
              You can upload a PDF now. After uploading, you'll need to wait {quota.cooldownDays} days before the next upload.
            </p>
          ) : (
            <div className="text-sm text-gray-700">
              <p className="mb-1">
                You can upload again in <strong>{daysRemaining} days</strong>
              </p>
              <p className="text-xs text-gray-500">
                Next upload available: {quota?.nextUploadDate ? new Date(quota.nextUploadDate).toLocaleDateString() : "N/A"}
              </p>
            </div>
          )}
        </div>

        {/* Upload Limits */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-semibold mb-2">Upload Limits</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Maximum file size: {quota?.maxSizeMB}MB</li>
            <li>• Maximum pages: {quota?.maxPages}</li>
            <li>• Questions generated: {quota?.maxQuestions}</li>
            <li>• Upload frequency: Once every {quota?.cooldownDays} days</li>
          </ul>
        </div>

        {/* Upload Form */}
        <div className="space-y-4">
          <div>
            <label htmlFor="file-input" className="block text-sm font-medium text-gray-700 mb-2">
              PDF File
            </label>
            <input
              id="file-input"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              disabled={!quota?.canUpload || uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {selectedFile && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
              </p>
            )}
          </div>

          <div>
            <label htmlFor="exam" className="block text-sm font-medium text-gray-700 mb-2">
              Entrance Exam
            </label>
            <select
              id="exam"
              value={selectedExam}
              onChange={(e) => setSelectedExam(e.target.value)}
              disabled={!quota?.canUpload || uploading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            >
              <option value="">Select an entrance exam</option>
              <option value="CUET">CUET</option>
              <option value="JEE">JEE Main</option>
              <option value="NEET">NEET</option>
              <option value="CET">CET</option>
              <option value="CLAT">CLAT</option>
              <option value="CAT">CAT</option>
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
              Subject Name
            </label>
            <input
              id="subject"
              type="text"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              placeholder="e.g., Physics, Mathematics, etc."
              disabled={!quota?.canUpload || uploading}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
            />
          </div>

          {uploadStatus.type && (
            <div
              className={`p-3 rounded-md ${
                uploadStatus.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {uploadStatus.message}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={
              !quota?.canUpload ||
              uploading ||
              !selectedFile ||
              !selectedSubject ||
              !selectedExam
            }
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}

