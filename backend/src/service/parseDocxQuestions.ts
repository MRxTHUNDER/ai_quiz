export interface ParsedDocxQuestion {
  questionNumber: number;
  questionsText: string;
  Options: string[];
  correctOption: string;
}

const QUESTION_LINE_RE = /^(\d+)[\.\)]\s+(.+)$/;
const OPTION_LINE_RE =
  /^([A-D])[\.\)\:][\s\u00A0\t]+(.+)$|^([A-D])[\s\u00A0\t]+(.+)$/i;
const ANSWER_LINE_RE = /^(\d+)[\.\)]\s*([A-D])\s*$/i;
const INLINE_ANSWER_RE =
  /^(?:correct\s+)?answer[\s\u00A0]*[:\-][\s\u00A0]*\(?([A-D])\)?\.?\s*$/i;
const ANSWER_ONLY_LETTER_RE = /^([A-D])\.?\s*$/i;
const ANSWER_KEY_HEADER_RE = /^answer[\s\u00A0]*key\b/i;

const MIN_OPTIONS = 2;
const MIN_QUESTION_TEXT_LENGTH = 5;
const LOOKAHEAD_LINES = 12;

export const normalizeDocxText = (rawText: string): string =>
  rawText
    .replace(/\u00A0/g, " ")
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/\uFF1A/g, ":")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

const isAnswerKeyAnswerLine = (line: string): boolean => {
  const match = line.match(ANSWER_LINE_RE);
  if (!match) return false;
  return match[2].length === 1;
};

const letterToIndex = (letter: string): number =>
  letter.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);

const parseOptionLine = (
  line: string,
): { letter: string; text: string } | null => {
  const match = line.match(OPTION_LINE_RE);
  if (!match) return null;

  const letter = (match[1] || match[3] || "").toUpperCase();
  const text = (match[2] || match[4] || "").trim();
  if (!letter || !text) return null;

  return { letter, text };
};

const isOptionLine = (line: string) => parseOptionLine(line) !== null;

const stripLeadingNumber = (line: string): string => {
  const numbered = line.match(QUESTION_LINE_RE);
  return numbered ? numbered[2].trim() : line.trim();
};

const isSkippableContextLine = (line: string): boolean => {
  if (/^themes?\s*:?\s*$/i.test(line)) return true;
  if (/^chapter\s+\d+/i.test(line)) return true;
  if (/^\d+\s+cuet\s+mcqs/i.test(line)) return true;
  if (line.length > 220 && !line.includes("?")) return true;
  return false;
};

const isQuestionStart = (lines: string[], index: number): boolean => {
  const line = lines[index];
  const questionMatch = line.match(QUESTION_LINE_RE);
  if (!questionMatch || isAnswerKeyAnswerLine(line)) {
    return false;
  }

  for (
    let j = index + 1;
    j < Math.min(index + LOOKAHEAD_LINES, lines.length);
    j++
  ) {
    const next = lines[j];

    if (isOptionLine(next)) {
      return true;
    }

    if (next.match(QUESTION_LINE_RE)) {
      return false;
    }

    if (INLINE_ANSWER_RE.test(next)) {
      return false;
    }
  }

  return false;
};

export const parseDocxPlainText = (rawText: string): ParsedDocxQuestion[] => {
  const lines = normalizeDocxText(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const answerKeyIndex = lines.findIndex((line) =>
    ANSWER_KEY_HEADER_RE.test(line),
  );

  const questionLines =
    answerKeyIndex === -1 ? lines : lines.slice(0, answerKeyIndex);
  const answerLines =
    answerKeyIndex === -1 ? [] : lines.slice(answerKeyIndex + 1);

  type DraftQuestion = {
    questionNumber: number;
    questionsText: string;
    options: { letter: string; text: string }[];
    answerLetter?: string;
  };

  const drafts: DraftQuestion[] = [];
  const state = {
    current: null as DraftQuestion | null,
    pendingAnswerLetter: false,
    pendingQuestionText: null as string | null,
    autoQuestionNumber: 1,
  };

  const discardCurrent = () => {
    state.current = null;
    state.pendingAnswerLetter = false;
  };

  const commitCurrentIfValid = () => {
    if (!state.current || state.current.options.length < MIN_OPTIONS) {
      discardCurrent();
      return;
    }

    drafts.push(state.current);
    state.current = null;
    state.pendingAnswerLetter = false;
  };

  const startQuestion = (questionText: string, questionNumber?: number) => {
    const cleaned = stripLeadingNumber(questionText);
    if (cleaned.length < MIN_QUESTION_TEXT_LENGTH) {
      return;
    }

    commitCurrentIfValid();

    state.current = {
      questionNumber: questionNumber ?? state.autoQuestionNumber++,
      questionsText: cleaned,
      options: [],
    };
    state.pendingQuestionText = null;
  };

  for (let i = 0; i < questionLines.length; i++) {
    const line = questionLines[i];

    if (state.pendingAnswerLetter && state.current) {
      const letterMatch = line.match(ANSWER_ONLY_LETTER_RE);
      if (letterMatch) {
        state.current.answerLetter = letterMatch[1].toUpperCase();
        commitCurrentIfValid();
        continue;
      }
      state.pendingAnswerLetter = false;
    }

    const inlineAnswerMatch = line.match(INLINE_ANSWER_RE);
    if (inlineAnswerMatch && state.current) {
      state.current.answerLetter = inlineAnswerMatch[1].toUpperCase();
      commitCurrentIfValid();
      continue;
    }

    if (/^answer[\s\u00A0]*:?\s*$/i.test(line) && state.current) {
      state.pendingAnswerLetter = true;
      continue;
    }

    const option = parseOptionLine(line);
    if (option) {
      if (!state.current && option.letter === "A" && state.pendingQuestionText) {
        startQuestion(state.pendingQuestionText);
      }

      if (state.current) {
        state.current.options.push(option);
      }
      continue;
    }

    if (isQuestionStart(questionLines, i)) {
      const questionMatch = line.match(QUESTION_LINE_RE);
      if (questionMatch) {
        startQuestion(questionMatch[2], Number(questionMatch[1]));
      }
      continue;
    }

    if (
      !isSkippableContextLine(line) &&
      !INLINE_ANSWER_RE.test(line) &&
      !isAnswerKeyAnswerLine(line) &&
      !/^answer[\s\u00A0]*:?\s*$/i.test(line)
    ) {
      state.pendingQuestionText = line;
    }
  }

  commitCurrentIfValid();

  const answers = new Map<number, string>();
  for (const line of answerLines) {
    const match = line.match(ANSWER_LINE_RE);
    if (!match) continue;
    answers.set(Number(match[1]), match[2].toUpperCase());
  }

  const results: ParsedDocxQuestion[] = [];

  for (const draft of drafts) {
    if (!draft.questionsText || draft.options.length < MIN_OPTIONS) {
      continue;
    }

    const options = draft.options.map((o) => o.text);
    const answerLetter =
      draft.answerLetter || answers.get(draft.questionNumber);

    if (!answerLetter) {
      continue;
    }

    const answerIndex = letterToIndex(answerLetter);
    const correctOption = options[answerIndex];

    if (!correctOption) {
      continue;
    }

    results.push({
      questionNumber: draft.questionNumber,
      questionsText: draft.questionsText,
      Options: options,
      correctOption,
    });
  }

  return results;
};

export const getParsePreviewLines = (rawText: string, limit = 15): string[] =>
  normalizeDocxText(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit);
