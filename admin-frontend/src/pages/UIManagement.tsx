import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUIFlags, updateUIFlags, type UIFlags } from "@/lib/uiFlags";
import {
  getAllEntranceExams,
  updateEntranceExam,
  type EntranceExam,
} from "@/lib/entranceExams";
import { axiosInstance } from "@/lib/axios";
import { Loader2 } from "lucide-react";

export default function UIManagement() {
  const [flags, setFlags] = useState<UIFlags>({
    questionsPageEnabled: true,
    featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [exams, setExams] = useState<EntranceExam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [examDescription, setExamDescription] = useState<string>("");
  const [examBannerSubjects, setExamBannerSubjects] = useState<string[]>([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [bannerStatus, setBannerStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    loadFlags();
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const examsData = await getAllEntranceExams();
      setExams(examsData);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFlags = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUIFlags();
      // Ensure data is valid before setting
      if (data && typeof data === "object") {
        setFlags({
          questionsPageEnabled: data.questionsPageEnabled ?? true,
          featuredExamNames:
            data.featuredExamNames && data.featuredExamNames.length > 0
              ? data.featuredExamNames
              : ["JEE", "NEET", "CET", "CUET"],
        });
      } else {
        // Fallback to default if data is invalid
        setFlags({
          questionsPageEnabled: true,
          featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
        });
      }
    } catch (err) {
      console.error("Error loading UI flags:", err);
      setError("Failed to load UI flags");
      // Set default flags on error
      setFlags({
        questionsPageEnabled: true,
        featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (field: keyof UIFlags, value: boolean) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Ensure flags is defined before spreading
      const currentFlags = flags || {
        questionsPageEnabled: true,
        featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
      };
      const updatedFlags = { ...currentFlags, [field]: value };
      await updateUIFlags(updatedFlags);
      setFlags(updatedFlags);
      setSuccess("UI flags updated successfully");

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating UI flags:", err);
      setError("Failed to update UI flags");
    } finally {
      setSaving(false);
    }
  };

  const handleBannerUpload = async () => {
    if (!selectedFile) {
      setBannerStatus({
        type: "error",
        message: "Please select an image file",
      });
      return;
    }
    if (!selectedExamId) {
      setBannerStatus({
        type: "error",
        message: "Please select an entrance exam",
      });
      return;
    }

    setUploadingBanner(true);
    setBannerStatus({ type: null, message: "" });

    try {
      // Get presigned URL
      const presignedResponse = await axiosInstance.post(
        "/upload/presigned-image-url",
        {
          fileName: selectedFile.name,
          contentType: selectedFile.type,
        },
      );

      const { url, fileUrl } = presignedResponse.data;

      // Upload file to S3
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: selectedFile,
        headers: {
          "Content-Type": selectedFile.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      // Update exam with banner URL
      const exam = exams.find((e) => e._id === selectedExamId);
      if (exam) {
        await updateEntranceExam(selectedExamId, {
          entranceExamName: exam.entranceExamName,
          entranceExamId: exam.entranceExamId,
          durationMinutes: exam.durationMinutes,
          subjects: exam.subjects.map((s) => ({
            subjectName: s.subject.subjectName,
            durationMinutes: s.durationMinutes,
            isEnabled: s.isEnabled,
          })),
          bannerImageUrl: fileUrl,
          description: examDescription,
          bannerSubjects: examBannerSubjects,
        });

        // Update local state
        setExams(
          exams.map((e) =>
            e._id === selectedExamId
              ? {
                  ...e,
                  bannerImageUrl: fileUrl,
                  description: examDescription,
                  bannerSubjects: examBannerSubjects,
                }
              : e,
          ),
        );

        setBannerStatus({
          type: "success",
          message: "Banner and description updated successfully!",
        });
        setSelectedFile(null);

        const fileInput = document.getElementById(
          "banner-upload",
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: unknown) {
      console.error(err);
      setBannerStatus({ type: "error", message: "Failed to upload banner" });
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDescriptionUpdateOnly = async () => {
    if (!selectedExamId) return;

    setUploadingBanner(true);
    setBannerStatus({ type: null, message: "" });
    try {
      const exam = exams.find((e) => e._id === selectedExamId);
      if (exam) {
        await updateEntranceExam(selectedExamId, {
          entranceExamName: exam.entranceExamName,
          entranceExamId: exam.entranceExamId,
          durationMinutes: exam.durationMinutes,
          subjects: exam.subjects.map((s) => ({
            subjectName: s.subject.subjectName,
            durationMinutes: s.durationMinutes,
            isEnabled: s.isEnabled,
          })),
          description: examDescription,
          bannerSubjects: examBannerSubjects,
        });

        setExams(
          exams.map((e) =>
            e._id === selectedExamId
              ? {
                  ...e,
                  description: examDescription,
                  bannerSubjects: examBannerSubjects,
                }
              : e,
          ),
        );

        setBannerStatus({
          type: "success",
          message: "Description updated successfully!",
        });
      }
    } catch (err) {
      console.error(err);
      setBannerStatus({
        type: "error",
        message: "Failed to update description",
      });
    } finally {
      setUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>UI Management</CardTitle>
          <CardDescription>
            Control visibility and access to UI components and pages for users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-md bg-green-50 text-green-800 text-sm">
              {success}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Questions Page Toggle */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-0.5 flex-1">
                <Label className="text-base font-semibold">
                  Questions Page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable or disable the Questions page in the user frontend.
                  When disabled, users will not be able to access or see the
                  Questions tab.
                </p>
              </div>
              <div className="ml-4">
                <Button
                  variant={
                    flags?.questionsPageEnabled === false
                      ? "destructive"
                      : "default"
                  }
                  size="sm"
                  onClick={() =>
                    handleToggle(
                      "questionsPageEnabled",
                      !(flags?.questionsPageEnabled ?? true),
                    )
                  }
                  disabled={saving}
                  className={
                    flags?.questionsPageEnabled === false
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }
                >
                  {flags?.questionsPageEnabled === false
                    ? "Disabled"
                    : "Enabled"}
                </Button>
              </div>
            </div>
          </div>

          {/* Featured Exam Names Configuration */}
          <div className="p-4 border rounded-lg">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">
                  Featured Exams (Home Page Text)
                </Label>
                <p className="text-sm text-muted-foreground">
                  Configure up to four entrance exams that appear in the
                  marketing text on the user Home page (e.g.{" "}
                  <span className="font-semibold">
                    JEE, NEET, CET, or CUET aspirant
                  </span>
                  ).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-sm">Exam {index + 1}</Label>
                    <Input
                      placeholder={
                        index === 0
                          ? "JEE"
                          : index === 1
                            ? "NEET"
                            : index === 2
                              ? "CET"
                              : "CUET"
                      }
                      value={flags.featuredExamNames?.[index] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        const current = flags.featuredExamNames ?? [
                          "JEE",
                          "NEET",
                          "CET",
                          "CUET",
                        ];
                        const updated = [...current];
                        updated[index] = value;
                        setFlags((prev) => ({
                          ...(prev || {
                            questionsPageEnabled: true,
                            featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
                          }),
                          featuredExamNames: updated,
                        }));
                      }}
                      disabled={saving}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      setSaving(true);
                      setError(null);
                      setSuccess(null);
                      const current = flags.featuredExamNames ?? [
                        "JEE",
                        "NEET",
                        "CET",
                        "CUET",
                      ];
                      const cleaned = current
                        .map((name) => name.trim())
                        .filter((name) => name.length > 0)
                        .slice(0, 4);
                      const updated = await updateUIFlags({
                        ...flags,
                        featuredExamNames: cleaned,
                      });
                      setFlags((prev) => ({
                        ...(prev || {
                          questionsPageEnabled: true,
                          featuredExamNames: ["JEE", "NEET", "CET", "CUET"],
                        }),
                        featuredExamNames:
                          updated.featuredExamNames &&
                          updated.featuredExamNames.length > 0
                            ? updated.featuredExamNames
                            : ["JEE", "NEET", "CET", "CUET"],
                      }));
                      setSuccess("Featured exams updated successfully");
                      setTimeout(() => setSuccess(null), 3000);
                    } catch (err) {
                      console.error("Error updating featured exams:", err);
                      setError("Failed to update featured exams");
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Featured Exams"}
                </Button>
              </div>
            </div>
          </div>

          {/* Entrance Exam Banners */}
          <div className="p-4 border rounded-lg">
            <div className="space-y-4">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">
                  Entrance Exam Banners, Descriptions & Subjects
                </Label>
                <p className="text-sm text-muted-foreground">
                  Upload a custom banner image, update the description, and
                  choose up to 3 subjects to highlight on the frontend home
                  page.
                </p>
              </div>

              <div className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="entrance-exam-select">Entrance Exam</Label>
                  <select
                    id="entrance-exam-select"
                    value={selectedExamId}
                    onChange={(e) => {
                      setSelectedExamId(e.target.value);
                      setSelectedFile(null);
                      setBannerStatus({ type: null, message: "" });
                      const selected = exams.find(
                        (exam) => exam._id === e.target.value,
                      );
                      if (selected) {
                        setExamDescription(
                          selected.description ||
                            `Prepare for ${selected.entranceExamName} with AI-powered quizzes customized across diverse subjects. Our AI ensures you're ready for entrance tests with adaptive and comprehensive practice.`,
                        );
                        setExamBannerSubjects(selected.bannerSubjects || []);
                      } else {
                        setExamDescription("");
                        setExamBannerSubjects([]);
                      }
                      const fileInput = document.getElementById(
                        "banner-upload",
                      ) as HTMLInputElement;
                      if (fileInput) fileInput.value = "";
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Select an entrance exam</option>
                    {exams.map((exam) => (
                      <option key={exam._id} value={exam._id}>
                        {exam.entranceExamName}{" "}
                        {exam.bannerImageUrl ? "(Has Banner)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedExamId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="exam-description">Description Text</Label>
                      <textarea
                        id="exam-description"
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={examDescription}
                        onChange={(e) => setExamDescription(e.target.value)}
                        disabled={uploadingBanner}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Banner Subjects (select up to 3)</Label>
                      <div className="flex flex-wrap gap-3 p-3 border rounded-md bg-secondary/20">
                        {exams.find((e) => e._id === selectedExamId)?.subjects
                          .length === 0 && (
                          <span className="text-sm text-muted-foreground">
                            No subjects found for this exam.
                          </span>
                        )}
                        {exams
                          .find((e) => e._id === selectedExamId)
                          ?.subjects.map((sub) => {
                            const subjectName = sub.subject.subjectName;
                            const isSelected =
                              examBannerSubjects.includes(subjectName);
                            return (
                              <div
                                key={subjectName}
                                className="flex items-center space-x-2"
                              >
                                <input
                                  type="checkbox"
                                  id={`subject-${selectedExamId}-${subjectName}`}
                                  checked={isSelected}
                                  disabled={
                                    uploadingBanner ||
                                    (!isSelected &&
                                      examBannerSubjects.length >= 3)
                                  }
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      if (examBannerSubjects.length < 3) {
                                        setExamBannerSubjects([
                                          ...examBannerSubjects,
                                          subjectName,
                                        ]);
                                      }
                                    } else {
                                      setExamBannerSubjects(
                                        examBannerSubjects.filter(
                                          (name) => name !== subjectName,
                                        ),
                                      );
                                    }
                                  }}
                                  className="rounded border-input text-primary focus:ring-1 focus:ring-ring"
                                />
                                <Label
                                  htmlFor={`subject-${selectedExamId}-${subjectName}`}
                                  className={`text-sm cursor-pointer ${!isSelected && examBannerSubjects.length >= 3 ? "opacity-50" : ""}`}
                                >
                                  {subjectName}
                                </Label>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="banner-upload">Banner Image</Label>
                      <Input
                        id="banner-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          setSelectedFile(file || null);
                          setBannerStatus({ type: null, message: "" });
                        }}
                        disabled={uploadingBanner}
                      />

                      {exams.find((e) => e._id === selectedExamId)
                        ?.bannerImageUrl &&
                        !selectedFile && (
                          <div className="mt-2 space-y-2">
                            <Label className="text-xs text-muted-foreground">
                              Current Banner:
                            </Label>
                            <img
                              src={
                                exams.find((e) => e._id === selectedExamId)
                                  ?.bannerImageUrl
                              }
                              alt="Current Banner"
                              className="h-24 object-cover rounded shadow-sm border border-border"
                            />
                          </div>
                        )}
                    </div>
                  </>
                )}

                {bannerStatus.type && (
                  <div
                    className={`p-3 rounded-md text-sm ${
                      bannerStatus.type === "success"
                        ? "bg-green-50 text-green-800"
                        : "bg-red-50 text-red-800"
                    }`}
                  >
                    {bannerStatus.message}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDescriptionUpdateOnly}
                    disabled={uploadingBanner || !selectedExamId}
                  >
                    Save Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleBannerUpload}
                    disabled={
                      uploadingBanner || !selectedFile || !selectedExamId
                    }
                  >
                    {uploadingBanner ? "Saving..." : "Upload Banner & Save"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes take effect immediately. When a
              page is disabled, users will not see the navigation link and
              cannot access the page even if they know the URL.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
