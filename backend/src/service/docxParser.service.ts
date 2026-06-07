import mammoth from "mammoth";
import {
  getParsePreviewLines,
  normalizeDocxText,
  parseDocxPlainText,
  ParsedDocxQuestion,
} from "./parseDocxQuestions";

const htmlToPlainLines = (html: string): string => {
  return normalizeDocxText(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">"),
  );
};

const extractPlainTextFromDocx = async (buffer: Buffer): Promise<string> => {
  const rawResult = await mammoth.extractRawText({ buffer });
  const rawText = rawResult.value?.trim() || "";

  if (rawText) {
    return rawText;
  }

  const htmlResult = await mammoth.convertToHtml({ buffer });
  return htmlToPlainLines(htmlResult.value || "");
};

export const extractQuestionsFromDocxBuffer = async (
  buffer: Buffer,
): Promise<ParsedDocxQuestion[]> => {
  const rawText = await extractPlainTextFromDocx(buffer);

  if (!rawText.trim()) {
    throw new Error("DOCX file contains no readable text");
  }

  let questions = parseDocxPlainText(rawText);

  if (!questions.length) {
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const htmlText = htmlToPlainLines(htmlResult.value || "");
    if (htmlText.trim() && htmlText !== normalizeDocxText(rawText)) {
      questions = parseDocxPlainText(htmlText);
    }
  }

  if (!questions.length) {
    const preview = getParsePreviewLines(rawText, 8)
      .map((line) => `- ${line.slice(0, 120)}`)
      .join("\n");

    throw new Error(
      `No questions could be parsed. Ensure each question has options A–D and either "Answer: C" or an Answer Key at the end.\nFirst lines seen:\n${preview}`,
    );
  }

  return questions;
};
