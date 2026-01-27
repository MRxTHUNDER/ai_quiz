import { axiosInstance } from "./axios";

export interface Subject {
  subject: {
    _id: string;
    subjectName: string;
    testDuration: number;
    isEnabled?: boolean;
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

/**
 * Fetch all entrance exams from the API
 */
export async function getAllEntranceExams(): Promise<EntranceExam[]> {
  try {
    const response = await axiosInstance.get<EntranceExamsResponse>(
      "/entrance-exam?includeDisabled=true"
    );
    return response.data.exams || [];
  } catch (error) {
    console.error("Error fetching entrance exams:", error);
    throw error;
  }
}

/**
 * Get entrance exam by ID
 */
export async function getEntranceExamById(id: string): Promise<EntranceExam> {
  try {
    const response = await axiosInstance.get<{
      message: string;
      exam: EntranceExam;
    }>(`/entrance-exam/${id}?includeDisabled=true`);
    return response.data.exam;
  } catch (error) {
    console.error("Error fetching entrance exam:", error);
    throw error;
  }
}

/**
 * Extract all unique subject names from an entrance exam
 */
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

export interface CreateExamData {
  entranceExamName: string;
  entranceExamId: string;
  durationMinutes: number;
  subjects: Array<{
    subjectName: string;
    durationMinutes: number;
    isEnabled?: boolean;
  }>;
  notes?: string;
  isEnabled?: boolean;
}

/**
 * Create a new entrance exam
 */
export async function createEntranceExam(
  data: CreateExamData
): Promise<EntranceExam> {
  try {
    const response = await axiosInstance.post<{
      message: string;
      exam: EntranceExam;
    }>("/entrance-exam/create", data);
    return response.data.exam;
  } catch (error) {
    console.error("Error creating entrance exam:", error);
    throw error;
  }
}

/**
 * Update an entrance exam
 */
export async function updateEntranceExam(
  id: string,
  data: Partial<CreateExamData>
): Promise<EntranceExam> {
  try {
    const response = await axiosInstance.put<{
      message: string;
      exam: EntranceExam;
    }>(`/entrance-exam/${id}`, data);
    return response.data.exam;
  } catch (error) {
    console.error("Error updating entrance exam:", error);
    throw error;
  }
}

/**
 * Delete an entrance exam
 */
export async function deleteEntranceExam(id: string): Promise<void> {
  try {
    await axiosInstance.delete(`/entrance-exam/${id}`);
  } catch (error) {
    console.error("Error deleting entrance exam:", error);
    throw error;
  }
}

/**
 * Update the display order of exams
 */
export async function updateExamOrder(
  examOrders: Array<{ examId: string; displayOrder: number }>
): Promise<void> {
  try {
    await axiosInstance.post("/entrance-exam/reorder", { examOrders });
  } catch (error) {
    console.error("Error updating exam order:", error);
    throw error;
  }
}