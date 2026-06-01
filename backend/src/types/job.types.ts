export type QuestionJobType =
  | "generate_from_pdf"
  | "generate_direct"
  | "import_from_docx";

export interface QuestionGenerationBasePayload {
  subjectId: string;
  entranceExamId: string;
  userId: string;
  numQuestions: number;
  topic?: string;
}

export interface GenerateFromPdfPayload extends QuestionGenerationBasePayload {
  type: "generate_from_pdf";
  pdfId: string;
  pdfUrl: string;
}

export interface GenerateDirectPayload extends QuestionGenerationBasePayload {
  type: "generate_direct";
}

export interface ImportFromDocxPayload {
  type: "import_from_docx";
  subjectId: string;
  entranceExamId: string;
  userId: string;
  docxKey: string;
  fileName: string;
}

export type QuestionGenerationPayload =
  | GenerateFromPdfPayload
  | GenerateDirectPayload
  | ImportFromDocxPayload;

export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "partial"
  | "cancelled";
