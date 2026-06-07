import mammoth from "mammoth";
import {
  parseDocxPlainText,
  ParsedDocxQuestion,
} from "./parseDocxQuestions";

export const extractQuestionsFromDocxBuffer = async (
  buffer: Buffer,
): Promise<ParsedDocxQuestion[]> => {
  const { value: rawText } = await mammoth.extractRawText({ buffer });

  if (!rawText?.trim()) {
    throw new Error("DOCX file contains no readable text");
  }

  const questions = parseDocxPlainText(rawText);

  if (!questions.length) {
    throw new Error(
      "No questions could be parsed. Use numbered questions (1. ...), options (A. ...), then either Answer: C after each question or an Answer Key section at the end.",
    );
  }

  return questions;
};
