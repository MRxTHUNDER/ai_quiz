import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import EditQuestionDialog from "./EditQuestionDialog";
import DeleteQuestionDialog from "./DeleteQuestionDialog";
import { axiosInstance } from "@/lib/axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import MathRenderer from "./MathRenderer";

export interface Question {
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

interface QuestionsListProps {
  questions: Question[];
  loading: boolean;
  onQuestionUpdated?: () => void;
  onQuestionDeleted?: () => void;
  currentPage?: number;
  limit?: number;
  selectedQuestionIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
}

export default function QuestionsList({
  questions,
  loading,
  onQuestionUpdated,
  onQuestionDeleted,
  currentPage = 1,
  limit = 10,
  selectedQuestionIds,
  onSelectionChange,
}: QuestionsListProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState<string | null>(null);

  // Calculate question number offset based on current page
  const questionNumberOffset = (currentPage - 1) * limit;

  // Convert option index to letter (0 -> a, 1 -> b, etc.)
  const getOptionLetter = (index: number): string => {
    return String.fromCharCode(97 + index); // 97 is 'a' in ASCII
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedQuestionIds);
      questions.forEach((q) => newSelected.add(q.id));
      onSelectionChange(newSelected);
    } else {
      const newSelected = new Set(selectedQuestionIds);
      questions.forEach((q) => newSelected.delete(q.id));
      onSelectionChange(newSelected);
    }
  };

  // Handle individual checkbox
  const handleQuestionSelect = (questionId: string, checked: boolean) => {
    const newSelected = new Set(selectedQuestionIds);
    if (checked) {
      newSelected.add(questionId);
    } else {
      newSelected.delete(questionId);
    }
    onSelectionChange(newSelected);
  };

  // Check if all questions on current page are selected
  const allCurrentPageSelected =
    questions.length > 0 &&
    questions.every((q) => selectedQuestionIds.has(q.id));
  const someCurrentPageSelected =
    questions.some((q) => selectedQuestionIds.has(q.id)) &&
    !allCurrentPageSelected;

  const handleEditClick = (question: Question) => {
    setSelectedQuestion(question);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  };

  const handleBulkDeleteClick = () => {
    if (selectedQuestionIds.size === 0) return;
    setBulkDeleteDialogOpen(true);
    setBulkDeleteError(null);
  };

  const handleBulkDelete = async () => {
    if (selectedQuestionIds.size === 0) return;

    setBulkDeleting(true);
    setBulkDeleteError(null);

    try {
      const response = await axiosInstance.delete("/question/bulk", {
        data: { questionIds: Array.from(selectedQuestionIds) },
      });

      if (response.data?.success) {
        // Clear selection after successful deletion
        onSelectionChange(new Set());
        setBulkDeleteDialogOpen(false);
        onQuestionDeleted?.();
      } else {
        setBulkDeleteError(response.data?.message || "Failed to delete questions");
      }
    } catch (error: unknown) {
      console.error("Error deleting questions:", error);
      const errorMessage =
        error &&
          typeof error === "object" &&
          "response" in error &&
          error.response &&
          typeof error.response === "object" &&
          "data" in error.response &&
          error.response.data &&
          typeof error.response.data === "object" &&
          "message" in error.response.data
          ? String(error.response.data.message)
          : "Failed to delete questions. Please try again.";
      setBulkDeleteError(errorMessage);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    onQuestionUpdated?.();
    setSelectedQuestion(null);
  };

  const handleDeleteSuccess = () => {
    onQuestionDeleted?.();
    setSelectedQuestion(null);
  };

  if (loading) {
    return (
      <div className="text-center py-8">Loading questions...</div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No questions found. Generate some questions to see them here.
      </div>
    );
  }

  return (
    <>
      {/* Bulk Actions Bar */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md mb-4 border">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allCurrentPageSelected}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {allCurrentPageSelected
                ? `All on page selected (${selectedQuestionIds.size} total)`
                : selectedQuestionIds.size > 0
                  ? `${selectedQuestionIds.size} selected${someCurrentPageSelected ? ` (${questions.filter(q => selectedQuestionIds.has(q.id)).length} on this page)` : ''}`
                  : "Select all"}
            </span>
          </div>
          {selectedQuestionIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDeleteClick}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected ({selectedQuestionIds.size})
            </Button>
          )}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, index) => {
          const questionNumber = questionNumberOffset + index + 1;
          const isSelected = selectedQuestionIds.has(question.id);

          return (
            <Card key={question.id} className="p-4">
              {/* Checkbox, Question Number, and Action Buttons */}
              <div className="flex items-start gap-3 mb-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) =>
                    handleQuestionSelect(question.id, checked as boolean)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-semibold text-lg text-primary">
                      Q{questionNumber}.
                    </span>
                    {/* Edit and Delete Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditClick(question)}
                        title="Edit question"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-8 w-8 bg-red-600 text-white hover:bg-red-700"
                        onClick={() => handleDeleteClick(question)}
                        title="Delete question"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pr-2">
                <div>
                  <p className="font-medium text-sm text-muted-foreground mb-1">
                    Question
                  </p>
                  <div className="text-base">
                    <MathRenderer text={question.questionsText} />
                  </div>
                </div>
                <div>
                  <p className="font-medium text-sm text-muted-foreground mb-2">
                    Options
                  </p>
                  <div className="space-y-2">
                    {question.Options.map((option, idx) => {
                      const optionLetter = getOptionLetter(idx);
                      const isCorrect = option === question.correctOption;
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 ${isCorrect ? "text-green-600 font-medium" : ""
                            }`}
                        >
                          <span className="font-semibold min-w-[20px]">
                            {optionLetter}.
                          </span>
                          <span className="flex-1">
                            <MathRenderer text={option} />
                          </span>
                          {isCorrect && (
                            <span className="text-xs text-green-600 font-medium">
                              (Correct)
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t pb-2">
                  <span>
                    <span className="font-medium">Entrance Exam:</span>{" "}
                    {question.entranceExam?.name || "N/A"}
                  </span>
                  <span>
                    Created: {new Date(question.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <EditQuestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        question={selectedQuestion}
        onSuccess={handleEditSuccess}
      />

      {/* Delete Dialog */}
      <DeleteQuestionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        question={selectedQuestion}
        onSuccess={handleDeleteSuccess}
      />

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogClose
            onClick={() => {
              setBulkDeleteDialogOpen(false);
              setBulkDeleteError(null);
            }}
            disabled={bulkDeleting}
          />
          <DialogHeader>
            <DialogTitle>Delete Selected Questions</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedQuestionIds.size} question(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Error Message */}
            {bulkDeleteError && (
              <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
                {bulkDeleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBulkDeleteDialogOpen(false);
                  setBulkDeleteError(null);
                }}
                disabled={bulkDeleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                {bulkDeleting ? "Deleting..." : `Delete ${selectedQuestionIds.size} Question(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

