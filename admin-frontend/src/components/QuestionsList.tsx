import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import EditQuestionDialog from "./EditQuestionDialog";
import DeleteQuestionDialog from "./DeleteQuestionDialog";

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
}

export default function QuestionsList({
  questions,
  loading,
  onQuestionUpdated,
  onQuestionDeleted,
}: QuestionsListProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);

  const handleEditClick = (question: Question) => {
    setSelectedQuestion(question);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (question: Question) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
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
      <div className="space-y-4">
        {questions.map((question) => (
          <Card key={question.id} className="p-4 relative">
            {/* Edit and Delete Buttons */}
            <div className="absolute top-4 right-4 flex gap-2">
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

            <div className="space-y-3 pr-20">
              <div>
                <p className="font-medium text-sm text-muted-foreground mb-1">
                  Question
                </p>
                <p className="text-base">{question.questionsText}</p>
              </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground mb-2">
                Options
              </p>
              <ul className="list-disc list-inside space-y-1">
                {question.Options.map((option, idx) => (
                  <li
                    key={idx}
                    className={
                      option === question.correctOption
                        ? "text-green-600 font-medium"
                        : ""
                    }
                  >
                    {option}
                    {option === question.correctOption && (
                      <span className="ml-2 text-xs">(Correct)</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
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
      ))}
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
    </>
  );
}

