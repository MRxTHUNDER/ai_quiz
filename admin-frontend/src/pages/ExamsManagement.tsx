import { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Clock,
  BookOpen,
  Eye,
  ChevronRight,
  GripVertical,
} from "lucide-react";
import {
  getAllEntranceExams,
  createEntranceExam,
  updateEntranceExam,
  deleteEntranceExam,
  updateExamOrder,
  type EntranceExam,
  type CreateExamData,
} from "@/lib/entranceExams";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SubjectInput {
  subjectName: string;
  durationMinutes: number;
  isEnabled: boolean;
}

// Sortable Exam Card Component
function SortableExamCard({
  exam,
  onEdit,
  onDelete,
  onToggleEnabled,
  onViewSubjects,
  formatDuration,
}: {
  exam: EntranceExam;
  onEdit: (exam: EntranceExam) => void;
  onDelete: (id: string, name: string) => void;
  onToggleEnabled: (exam: EntranceExam) => void;
  onViewSubjects: (exam: EntranceExam) => void;
  formatDuration: (minutes: number) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exam._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="hover:shadow-lg transition-shadow flex flex-col"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
              aria-label="Drag to reorder"
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <CardTitle className="text-xl mb-1">
                {exam.entranceExamName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                ID: {exam.entranceExamId}
              </p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant={exam.isEnabled === false ? "destructive" : "default"}
              size="sm"
              onClick={async (e) => {
                e.stopPropagation();
                onToggleEnabled(exam);
              }}
              className={
                exam.isEnabled === false
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              }
            >
              {exam.isEnabled === false ? "Disabled" : "Enabled"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={exam.isEnabled === false}
              onClick={(e) => {
                if (exam.isEnabled === false) return;
                e.stopPropagation();
                onEdit(exam);
              }}
              className="h-8 w-8 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(exam._id, exam.entranceExamName);
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
            <span className="font-semibold">{exam.subjects.length}</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full mt-auto"
          onClick={() => onViewSubjects(exam)}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Subjects
          <ChevronRight className="h-4 w-4 ml-auto" />
        </Button>
      </CardContent>
    </Card>
  );
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
  const [updatingLimits, setUpdatingLimits] = useState<Record<string, boolean>>(
    {},
  );

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Form state
  const [formData, setFormData] = useState({
    entranceExamName: "",
    entranceExamId: "",
    durationMinutes: "",
    notes: "",
    isEnabled: "true",
    weeklyLimit: "7",
  });
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { subjectName: "", durationMinutes: 0, isEnabled: true },
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
      isEnabled: "true",
      weeklyLimit: "7",
    });
    setSubjects([{ subjectName: "", durationMinutes: 0, isEnabled: true }]);
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
      isEnabled: exam.isEnabled === false ? "false" : "true",
      weeklyLimit: exam.weeklyLimit?.toString() || "7",
    });
    setSubjects(
      exam.subjects.map((sub) => ({
        subjectName: sub.subject.subjectName,
        durationMinutes: sub.durationMinutes,
        isEnabled: sub.isEnabled !== false,
      })),
    );
    setError(null);
    setIsDialogOpen(true);
  };

  const handleAddSubject = () => {
    setSubjects([
      ...subjects,
      { subjectName: "", durationMinutes: 0, isEnabled: true },
    ]);
  };

  const handleRemoveSubject = (index: number) => {
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = (
    index: number,
    field: keyof SubjectInput,
    value: string | number | boolean,
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
      const examData = {
        entranceExamName: formData.entranceExamName,
        entranceExamId: formData.entranceExamId,
        durationMinutes: parseInt(formData.durationMinutes),
        subjects: subjects.map((s) => ({
          subjectName: s.subjectName,
          durationMinutes: s.durationMinutes,
          isEnabled: s.isEnabled,
        })),
        notes: formData.notes || undefined,
        isEnabled: formData.isEnabled === "true",
        weeklyLimit: parseInt(formData.weeklyLimit) || 7,
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
        `Are you sure you want to delete "${name}"? This action cannot be undone.`,
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

  // Swap two items in an array
  const swapItems = <T,>(array: T[], index1: number, index2: number): T[] => {
    const newArray = [...array];
    [newArray[index1], newArray[index2]] = [newArray[index2], newArray[index1]];
    return newArray;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = exams.findIndex((exam) => exam._id === active.id);
    const newIndex = exams.findIndex((exam) => exam._id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Swap the two items instead of shifting
    const newExams = swapItems(exams, oldIndex, newIndex);
    setExams(newExams);

    // Update displayOrder in backend
    try {
      const examOrders = newExams.map((exam, index) => ({
        examId: exam._id,
        displayOrder: index,
      }));

      await updateExamOrder(examOrders);
    } catch (error) {
      console.error("Failed to update exam order:", error);
      // Revert on error
      await fetchExams();
      alert("Failed to update exam order. Please try again.");
    }
  };

  const handleToggleEnabled = async (exam: EntranceExam) => {
    try {
      await updateEntranceExam(exam._id, {
        isEnabled: exam.isEnabled === false,
      } as Partial<CreateExamData>);
      await fetchExams();
    } catch (err) {
      console.error("Failed to toggle exam status:", err);
    }
  };

  const handleUpdateExamLimit = async (examId: string, newLimit: string) => {
    const limit = parseInt(newLimit);
    if (isNaN(limit) || limit < 1) {
      alert("Please enter a valid number greater than 0");
      return;
    }

    try {
      setUpdatingLimits((prev) => ({ ...prev, [examId]: true }));
      await updateEntranceExam(examId, { weeklyLimit: limit });
      await fetchExams();
    } catch (err) {
      console.error("Failed to update exam limit:", err);
      alert("Failed to update exam weekly limit.");
    } finally {
      setUpdatingLimits((prev) => ({ ...prev, [examId]: false }));
    }
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exams.map((exam) => exam._id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <SortableExamCard
                  key={exam._id}
                  exam={exam}
                  onEdit={openEditDialog}
                  onDelete={handleDelete}
                  onToggleEnabled={handleToggleEnabled}
                  onViewSubjects={openSubjectsDialog}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Weekly Limits Configuration Section */}
      {exams.length > 0 && (
        <Card className="mt-8 border-t-4 border-t-primary/20">
          <CardHeader>
            <CardTitle>Weekly Limits Configuration</CardTitle>
            <CardDescription>
              Directly modify the maximum number of times users can attempt each
              exam and subject per week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {exams.map((exam) => (
                <div
                  key={exam._id}
                  className="border rounded-lg bg-card overflow-hidden"
                >
                  <div className="bg-muted/30 px-4 py-3 border-b flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">
                        {exam.entranceExamName}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <Label
                        htmlFor={`limit-exam-${exam._id}`}
                        className="font-medium whitespace-nowrap"
                      >
                        Exam Weekly Limit:
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`limit-exam-${exam._id}`}
                          type="number"
                          className="w-24 h-9"
                          min="1"
                          defaultValue={exam.weeklyLimit || 7}
                          onBlur={(e) => {
                            if (
                              e.target.value !== String(exam.weeklyLimit || 7)
                            ) {
                              handleUpdateExamLimit(exam._id, e.target.value);
                            }
                          }}
                          disabled={updatingLimits[exam._id]}
                        />
                        {updatingLimits[exam._id] && (
                          <span className="text-xs text-muted-foreground animate-pulse">
                            Saving...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

            <div className="grid grid-cols-3 gap-4">
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
                    setFormData({
                      ...formData,
                      durationMinutes: e.target.value,
                    })
                  }
                  placeholder="e.g., 180"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weeklyLimit">
                  Weekly Limit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="weeklyLimit"
                  type="number"
                  min="1"
                  value={formData.weeklyLimit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weeklyLimit: e.target.value,
                    })
                  }
                  placeholder="e.g., 7"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="examEnabled">Exam Status</Label>
                <Button
                  type="button"
                  id="examEnabled"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      isEnabled:
                        formData.isEnabled === "true" ? "false" : "true",
                    })
                  }
                  className={
                    formData.isEnabled === "true"
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  }
                >
                  {formData.isEnabled === "true" ? "Enabled" : "Disabled"}
                </Button>
              </div>
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
                            e.target.value,
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
                            parseInt(e.target.value) || 0,
                          )
                        }
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        handleSubjectChange(
                          index,
                          "isEnabled",
                          !subject.isEnabled,
                        )
                      }
                      className={
                        subject.isEnabled
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }
                    >
                      {subject.isEnabled ? "Enabled" : "Disabled"}
                    </Button>
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
                        <span
                          className={`text-xs ${
                            sub.isEnabled === false
                              ? "text-destructive"
                              : "text-emerald-600"
                          }`}
                        >
                          {sub.isEnabled === false ? "Disabled" : "Enabled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDuration(sub.durationMinutes)}
                        </span>
                        <Button
                          size="sm"
                          onClick={async () => {
                            if (!viewingExam) return;
                            try {
                              const updatedSubjects = viewingExam.subjects.map(
                                (s, i) => ({
                                  subjectName: s.subject.subjectName,
                                  durationMinutes: s.durationMinutes,
                                  totalQuestions:
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    (s as any).totalQuestions ?? 50,
                                  isEnabled:
                                    i === idx
                                      ? sub.isEnabled === false
                                      : s.isEnabled !== false,
                                }),
                              );

                              await updateEntranceExam(viewingExam._id, {
                                entranceExamName: viewingExam.entranceExamName,
                                entranceExamId: viewingExam.entranceExamId,
                                durationMinutes: viewingExam.durationMinutes,
                                notes: viewingExam.notes,
                                subjects: updatedSubjects,
                              });

                              await fetchExams();
                            } catch (err) {
                              console.error(
                                "Failed to toggle subject status:",
                                err,
                              );
                            }
                          }}
                          className={
                            sub.isEnabled === false
                              ? "bg-red-500 hover:bg-red-600 text-white"
                              : "bg-emerald-500 hover:bg-emerald-600 text-white"
                          }
                        >
                          {sub.isEnabled === false ? "Disabled" : "Enabled"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {viewingExam.isEnabled !== false && (
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
                )}
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
