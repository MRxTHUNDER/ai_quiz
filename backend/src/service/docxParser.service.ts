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
  console.log("[docx-import] Extracting text from DOCX...");

  const rawText = await extractPlainTextFromDocx(buffer);

  if (!rawText.trim()) {
    console.error("[docx-import] Failed: DOCX contains no readable text");
    throw new Error("DOCX file contains no readable text");
  }

  const lineCount = normalizeDocxText(rawText)
    .split("\n")
    .filter((line) => line.trim().length > 0).length;
  console.log(`[docx-import] Extracted ${lineCount} non-empty lines`);

  let questions = parseDocxPlainText(rawText);
  console.log(`[docx-import] Parsed ${questions.length} questions from raw text`);

  if (!questions.length) {
    console.log("[docx-import] Raw text parse failed, trying HTML fallback...");
    const htmlResult = await mammoth.convertToHtml({ buffer });
    const htmlText = htmlToPlainLines(htmlResult.value || "");
    if (htmlText.trim() && htmlText !== normalizeDocxText(rawText)) {
      questions = parseDocxPlainText(htmlText);
      console.log(
        `[docx-import] Parsed ${questions.length} questions from HTML fallback`,
      );
    } else {
      console.log("[docx-import] HTML fallback skipped (same or empty text)");
    }
  }

  if (!questions.length) {
    const preview = getParsePreviewLines(rawText, 8)
      .map((line) => `- ${line.slice(0, 120)}`)
      .join("\n");

    console.error("[docx-import] Failed: no questions parsed. First lines:");
    console.error(preview);

    throw new Error(
      `No questions could be parsed. Ensure each question has options A–D and either "Answer: C" or an Answer Key at the end.\nFirst lines seen:\n${preview}`,
    );
  }

  console.log(`[docx-import] Success: ${questions.length} questions ready to import`);
  return questions;
};
