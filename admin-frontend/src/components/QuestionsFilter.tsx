import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getAllEntranceExams, type EntranceExam } from "@/lib/entranceExams";
import { useEffect, useState } from "react";

interface QuestionsFilterProps {
  selectedEntranceExamId: string;
  selectedSubjectId: string;
  onEntranceExamChange: (examId: string) => void;
  onSubjectChange: (subjectId: string) => void;
  onReset: () => void;
  loadingExams: boolean;
}

export default function QuestionsFilter({
  selectedEntranceExamId,
  selectedSubjectId,
  onEntranceExamChange,
  onSubjectChange,
  onReset,
  loadingExams,
}: QuestionsFilterProps) {
  const [entranceExams, setEntranceExams] = useState<EntranceExam[]>([]);
  const [filteredSubjects, setFilteredSubjects] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Fetch entrance exams
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const exams = await getAllEntranceExams();
        setEntranceExams(exams);
      } catch (error) {
        console.error("Failed to fetch entrance exams:", error);
      }
    };
    fetchExams();
  }, []);

  // Fetch subjects when entrance exam is selected
  useEffect(() => {
    if (!selectedEntranceExamId) {
      setFilteredSubjects([]);
      return;
    }

    setLoadingSubjects(true);
    try {
      const selectedExam = entranceExams.find(
        (exam) =>
          exam.entranceExamId === selectedEntranceExamId ||
          exam._id === selectedEntranceExamId
      );

      if (selectedExam && selectedExam.subjects) {
        // Extract subjects with their IDs from the exam
        const subjects = selectedExam.subjects
          .filter((sub) => sub.subject && sub.subject._id)
          .map((sub) => ({
            id: sub.subject._id,
            name: sub.subject.subjectName,
          }));

        // Remove duplicates by ID
        const uniqueSubjects = Array.from(
          new Map(subjects.map((s) => [s.id, s])).values()
        );

        setFilteredSubjects(uniqueSubjects);
      } else {
        setFilteredSubjects([]);
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
      setFilteredSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, [selectedEntranceExamId, entranceExams]);

  const hasFilters = selectedEntranceExamId || selectedSubjectId;

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-muted/50 rounded-lg border">
      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="filter-entrance-exam">Entrance Exam</Label>
        <select
          id="filter-entrance-exam"
          value={selectedEntranceExamId}
          onChange={(e) => onEntranceExamChange(e.target.value)}
          disabled={loadingExams}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
        >
          <option value="">All Entrance Exams</option>
          {entranceExams.map((exam) => (
            <option key={exam._id} value={exam.entranceExamId}>
              {exam.entranceExamName}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <Label htmlFor="filter-subject">Subject</Label>
        <select
          id="filter-subject"
          value={selectedSubjectId}
          onChange={(e) => onSubjectChange(e.target.value)}
          disabled={!selectedEntranceExamId || loadingSubjects}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
        >
          <option value="">
            {selectedEntranceExamId
              ? filteredSubjects.length > 0
                ? "All Subjects"
                : "No subjects available"
              : "Select entrance exam first"}
          </option>
          {filteredSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="outline" onClick={onReset} className="h-9">
          Clear Filters
        </Button>
      )}
    </div>
  );
}
