import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { axiosInstance } from "@/lib/axios";
import type { Question } from "./QuestionsList";

interface EditQuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question: Question | null;
  onSuccess: () => void;
}

export default function EditQuestionDialog({
  open,
  onOpenChange,
  question,
  onSuccess,
}: EditQuestionDialogProps) {
  const [questionsText, setQuestionsText] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [correctOption, setCorrectOption] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form when question changes
  useEffect(() => {
    if (question) {
      setQuestionsText(question.questionsText);
      setOptions([...question.Options]);
      setCorrectOption(question.correctOption);
      setError(null);
    }
  }, [question]);

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddOption = () => {
    setOptions([...options, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      setError("At least 2 options are required");
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    // If removed option was correct, reset correct option
    if (options[index] === correctOption) {
      setCorrectOption("");
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!questionsText.trim()) {
      setError("Question text is required");
      return;
    }

    if (options.length < 2) {
      setError("At least 2 options are required");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim() !== "");
    if (validOptions.length < 2) {
      setError("At least 2 non-empty options are required");
      return;
    }

    if (!correctOption || !validOptions.includes(correctOption)) {
      setError("Please select a valid correct option");
      return;
    }

    if (!question) return;

    setLoading(true);
    try {
      await axiosInstance.put(`/question/${question.id}`, {
        questionsText: questionsText.trim(),
        Options: validOptions.map((opt) => opt.trim()),
        correctOption: correctOption.trim(),
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error updating question:", err);
      const errorMessage =
        err &&
        typeof err === "object" &&
        "response" in err &&
        err.response &&
        typeof err.response === "object" &&
        "data" in err.response &&
        err.response.data &&
        typeof err.response.data === "object" &&
        "message" in err.response.data
          ? String(err.response.data.message)
          : "Failed to update question. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!question) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Question</DialogTitle>
          <DialogDescription>
            Update the question text, options, and correct answer.
          </DialogDescription>
          <DialogClose onClick={() => onOpenChange(false)} />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Text */}
          <div className="space-y-2">
            <Label htmlFor="question-text">Question Text</Label>
            <Input
              id="question-text"
              value={questionsText}
              onChange={(e) => setQuestionsText(e.target.value)}
              placeholder="Enter the question..."
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
              >
                Add Option
              </Button>
            </div>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveOption(index)}
                    disabled={options.length <= 2}
                  >
                    Remove
                  </Button>
                  <Button
                    type="button"
                    variant={correctOption === option ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCorrectOption(option)}
                    disabled={!option.trim()}
                  >
                    {correctOption === option ? "Correct" : "Set Correct"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-50 text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Question"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
