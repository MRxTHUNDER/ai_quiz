import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  BookOpen,
  Eye,
  ChevronRight,
} from "lucide-react";
import {
  getAllEntranceExams,
  createEntranceExam,
  updateEntranceExam,
  deleteEntranceExam,
  type EntranceExam,
  type CreateExamData,
} from "@/lib/entranceExams";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";

interface SubjectInput {
  subjectName: string;
  durationMinutes: number;
}

export default function ExamsManagement() {
  const [exams, setExams] = useState<EntranceExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubjectsDialogOpen, setIsSubjectsDialogOpen] = useState(false);
  const [viewingExam, setViewingExam] = useState<EntranceExam | null>(null);
  const [editingExam, setEditingExam] = useState<EntranceExam | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    entranceExamName: "",
    entranceExamId: "",
    durationMinutes: "",
    notes: "",
  });
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { subjectName: "", durationMinutes: 0 },
  ]);

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const data = await getAllEntranceExams();
      setExams(data);
    } catch (error) {
      console.error("Failed to fetch exams:", error);
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingExam(null);
    setFormData({
      entranceExamName: "",
      entranceExamId: "",
      durationMinutes: "",
      notes: "",
    });
    setSubjects([{ subjectName: "", durationMinutes: 0 }]);
    setError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (exam: EntranceExam) => {
    setEditingExam(exam);
    setFormData({
      entranceExamName: exam.entranceExamName,
      entranceExamId: exam.entranceExamId,
      durationMinutes: exam.durationMinutes.toString(),
      notes: exam.notes || "",
    });
    setSubjects(
      exam.subjects.map((sub) => ({
        subjectName: sub.subject.subjectName,
        durationMinutes: sub.durationMinutes,
      }))
    );
    setError(null);
    setIsDialogOpen(true);
  };

  const handleAddSubject = () => {
    setSubjects([...subjects, { subjectName: "", durationMinutes: 0 }]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (
    index: number,
    field: keyof SubjectInput,
    value: string | number
  ) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      !formData.entranceExamName ||
      !formData.entranceExamId ||
      !formData.durationMinutes
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (
      subjects.length === 0 ||
      subjects.some((s) => !s.subjectName || s.durationMinutes <= 0)
    ) {
      setError("Please add at least one subject with valid duration");
      return;
    }

    setIsSubmitting(true);

    try {
      const examData: CreateExamData = {
        entranceExamName: formData.entranceExamName,
        entranceExamId: formData.entranceExamId,
        durationMinutes: parseInt(formData.durationMinutes),
        subjects: subjects.map((s) => ({
          subjectName: s.subjectName,
          durationMinutes: s.durationMinutes,
        })),
        notes: formData.notes || undefined,
      };

      if (editingExam) {
        await updateEntranceExam(editingExam._id, examData);
      } else {
        await createEntranceExam(examData);
      }

      setIsDialogOpen(false);
      await fetchExams();
    } catch (error: unknown) {
      console.error("Failed to save exam:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to save exam. Please try again.";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteEntranceExam(id);
      await fetchExams();
    } catch (error: unknown) {
      console.error("Failed to delete exam:", error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Failed to delete exam";
      alert(errorMessage);
    }
  };

  const openSubjectsDialog = (exam: EntranceExam) => {
    setViewingExam(exam);
    setIsSubjectsDialogOpen(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-lg">Loading exams...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams & Subjects Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage entrance exams, their subjects, and timing
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No exams found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first entrance exam to get started
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Exam
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => (
            <Card
              key={exam._id}
              className="hover:shadow-lg transition-shadow flex flex-col"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">
                      {exam.entranceExamName}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      ID: {exam.entranceExamId}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(exam);
                      }}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(exam._id, exam.entranceExamName);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Total Duration:</span>
                    <span>{formatDuration(exam.durationMinutes)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Subjects:</span>
                    <span className="font-semibold">
                      {exam.subjects.length}
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-auto"
                  onClick={() => openSubjectsDialog(exam)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Subjects
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setIsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {editingExam ? "Edit Exam" : "Create New Exam"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entranceExamName">
                  Exam Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entranceExamName"
                  value={formData.entranceExamName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      entranceExamName: e.target.value,
                    })
                  }
                  placeholder="e.g., JEE Main"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entranceExamId">
                  Exam ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="entranceExamId"
                  value={formData.entranceExamId}
                  onChange={(e) =>
                    setFormData({ ...formData, entranceExamId: e.target.value })
                  }
                  placeholder="e.g., JEE-MAIN-2024"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">
                Total Duration (minutes){" "}
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="durationMinutes"
                type="number"
                min="1"
                value={formData.durationMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: e.target.value })
                }
                placeholder="e.g., 180"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>
                Subjects <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-3 border rounded-lg p-4">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`subject-${index}`} className="text-xs">
                        Subject Name
                      </Label>
                      <Input
                        id={`subject-${index}`}
                        value={subject.subjectName}
                        onChange={(e) =>
                          handleSubjectChange(
                            index,
                            "subjectName",
                            e.target.value
                          )
                        }
                        placeholder="e.g., Mathematics"
                        required
                      />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label htmlFor={`duration-${index}`} className="text-xs">
                        Duration (min)
                      </Label>
                      <Input
                        id={`duration-${index}`}
                        type="number"
                        min="1"
                        value={subject.durationMinutes}
                        onChange={(e) =>
                          handleSubjectChange(
                            index,
                            "durationMinutes",
                            parseInt(e.target.value) || 0
                          )
                        }
                        required
                      />
                    </div>
                    {subjects.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSubject(index)}
                        className="h-9 w-9 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSubject}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Additional notes about this exam"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : editingExam
                  ? "Update Exam"
                  : "Create Exam"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Subjects View Dialog */}
      <Dialog
        open={isSubjectsDialogOpen}
        onOpenChange={setIsSubjectsDialogOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogClose onClick={() => setIsSubjectsDialogOpen(false)} />
          <DialogHeader>
            <DialogTitle>
              {viewingExam?.entranceExamName} - Subjects
            </DialogTitle>
            <DialogDescription>
              View all subjects and their durations for this exam
            </DialogDescription>
          </DialogHeader>

          {viewingExam && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Duration
                  </p>
                  <p className="text-lg font-semibold">
                    {formatDuration(viewingExam.durationMinutes)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Subjects
                  </p>
                  <p className="text-lg font-semibold">
                    {viewingExam.subjects.length}
                  </p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 border-b">
                  <h3 className="font-semibold text-sm">Subject Details</h3>
                </div>
                <div className="divide-y max-h-[400px] overflow-y-auto">
                  {viewingExam.subjects.map((sub, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {idx + 1}
                        </div>
                        <span className="font-medium">
                          {sub.subject.subjectName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDuration(sub.durationMinutes)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubjectsDialogOpen(false);
                    openEditDialog(viewingExam);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Exam
                </Button>
                <Button onClick={() => setIsSubjectsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
