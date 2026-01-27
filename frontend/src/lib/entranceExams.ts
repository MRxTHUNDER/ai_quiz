import { axiosInstance } from "./axio";

export interface Subject {
  subject: {
    _id: string;
    subjectName: string;
    testDuration: number;
  };
  durationMinutes: number;
  isEnabled?: boolean;
}

export interface EntranceExam {
  _id: string;
  entranceExamName: string;
  entranceExamId: string;
  durationMinutes: number;
  subjects: Subject[];
  notes?: string;
  isEnabled?: boolean;
  displayOrder?: number;
}

export interface EntranceExamsResponse {
  message: string;
  exams: EntranceExam[];
}

export async function getAllEntranceExams(): Promise<EntranceExam[]> {
  try {
    const response = await axiosInstance.get<EntranceExamsResponse>(
      "/entrance-exam"
    );

    const exams = response.data.exams || [];

    // Defensive client-side filtering: only enabled exams & subjects
    // Note: Order is preserved from backend (sorted by displayOrder)
    // Do not sort this array - it maintains the admin-defined order
    return exams
      .filter((exam) => exam.isEnabled !== false)
      .map((exam) => ({
        ...exam,
        subjects:
          exam.subjects?.filter((sub) => sub.isEnabled !== false) ?? [],
      }));
  } catch (error) {
    console.error("Error fetching entrance exams:", error);
    throw error;
  }
}

export async function getEntranceExamById(id: string): Promise<EntranceExam> {
  try {
    const response = await axiosInstance.get<{
      message: string;
      exam: EntranceExam;
    }>(`/entrance-exam/${id}`);

    const exam = response.data.exam;

    if (!exam) {
      throw new Error("Entrance exam not found");
    }

    if (exam.isEnabled === false) {
      throw new Error("Entrance exam is disabled");
    }

    return {
      ...exam,
      subjects:
        exam.subjects?.filter((sub) => sub.isEnabled !== false) ?? [],
    };
  } catch (error) {
    console.error("Error fetching entrance exam:", error);
    throw error;
  }
}

export function getSubjectNamesFromExam(exam: EntranceExam): string[] {
  const subjectNames = new Set<string>();

  if (exam.subjects && exam.subjects.length > 0) {
    exam.subjects.forEach((sub) => {
      if (sub.subject && sub.subject.subjectName) {
        subjectNames.add(sub.subject.subjectName.trim());
      }
    });
  }

  return Array.from(subjectNames);
}

/**
 * Get subject ID for a specific subject name in an exam
 */
export function getSubjectIdFromExam(
  exam: EntranceExam,
  subjectName: string
): string | null {
  const subject = exam.subjects.find(
    (sub) => sub.subject?.subjectName?.trim() === subjectName.trim()
  );
  return subject?.subject?._id || null;
}

/**
 * Get subject duration for a specific subject in an exam
 */
export function getSubjectDuration(
  exam: EntranceExam,
  subjectName: string
): number | null {
  const subject = exam.subjects.find(
    (sub) => sub.subject?.subjectName?.trim() === subjectName.trim()
  );
  return subject?.durationMinutes || null;
}
