import { axiosInstance } from "./axio";

export interface Subject {
  subject: {
    _id: string;
    subjectName: string;
    testDuration: number;
  };
  durationMinutes: number;
}

export interface EntranceExam {
  _id: string;
  entranceExamName: string;
  entranceExamId: string;
  durationMinutes: number;
  subjects: Subject[];
  notes?: string;
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
    return response.data.exams || [];
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
    return response.data.exam;
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
