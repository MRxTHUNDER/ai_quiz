import { useState, useEffect } from "react";
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
import { axiosInstance } from "@/lib/axios";
import {
  getAllEntranceExams,
  getSubjectNamesFromExam,
  type EntranceExam,
} from "@/lib/entranceExams";

export default function UploadPdf() {
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [filteredSubjects, setFilteredSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedEntranceExamId, setSelectedEntranceExamId] =
    useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Fetch entrance exams on component mount
  useEffect(() => {
    const fetchExams = async () => {
      try {
        setLoadingExams(true);
        const exams = await getAllEntranceExams();
        setEntranceExams(exams);
      } catch (error) {
        console.error("Failed to fetch entrance exams:", error);
        setUploadStatus({
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
        setUploadStatus({
          type: "error",
          message: "Please select a PDF file",
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
        message: "Please select a subject",
      });
      return;
    }

    if (!selectedEntranceExamId) {
      setUploadStatus({
        type: "error",
        message: "Please select an entrance exam",
      });
      return;
    }

    setUploading(true);
    setUploadStatus({ type: null, message: "" });

    try {
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

      // Step 3: Tag the PDF with subject and entrance exam
      // The backend will construct the fileUrl from the key
      // Find the selected exam to get its entranceExamId
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === selectedEntranceExamId ||
          exam._id === selectedEntranceExamId
      );
      const examId = selectedExam?.entranceExamId || selectedEntranceExamId;

      await axiosInstance.post("/upload/tag", {
        fileName: selectedFile.name,
        key,
        subjectId: selectedSubject,
        entranceExamId: examId,
      });

      setUploadStatus({
        type: "success",
        message: "PDF uploaded and tagged successfully!",
      });

      // Reset form
      setSelectedFile(null);
      setSelectedSubject("");
      setSelectedEntranceExamId("");
      const fileInput = document.getElementById(
        "file-input"
      ) as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error: unknown) {
      console.error("Upload error:", error);
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error.response as { data?: { message?: string } })?.data?.message
          : undefined;
      setUploadStatus({
        type: "error",
        message: errorMessage || "Failed to upload PDF",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Upload PDF</CardTitle>
          <CardDescription>
            Upload a PDF file and tag it with a subject and entrance exam
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="file-input">PDF File</Label>
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="entrance-exam">Entrance Exam</Label>
            <select
              id="entrance-exam"
              value={selectedEntranceExamId}
              onChange={(e) => handleEntranceExamChange(e.target.value)}
              disabled={loadingExams}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {loadingExams ? "Loading exams..." : "Select an entrance exam"}
              </option>
              {entranceExams.map((exam) => (
                <option key={exam._id} value={exam.entranceExamId}>
                  {exam.entranceExamName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
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
                {!selectedEntranceExamId
                  ? "Select an entrance exam first"
                  : filteredSubjects.length === 0
                  ? "No subjects available for this exam"
                  : "Select a subject"}
              </option>
              {filteredSubjects.map((subjectName, index) => (
                <option key={index} value={subjectName}>
                  {subjectName}
                </option>
              ))}
            </select>
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

          <Button
            onClick={handleUpload}
            disabled={
              uploading ||
              !selectedFile ||
              !selectedSubject ||
              !selectedEntranceExamId ||
              loadingExams
            }
            className="w-full"
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
