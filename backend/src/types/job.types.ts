export type QuestionJobType = "generate_from_pdf" | "generate_direct";

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

export type QuestionGenerationPayload =
  | GenerateFromPdfPayload
  | GenerateDirectPayload;

export type BackgroundJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "partial"
  | "cancelled";
