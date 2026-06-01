export interface ParsedDocxQuestion {
  questionNumber: number;
  questionsText: string;
  Options: string[];
  correctOption: string;
}

const QUESTION_LINE_RE = /^(\d+)\.\s+(.+)$/;
const OPTION_LINE_RE = /^([A-D])\.\s+(.+)$/i;
const ANSWER_LINE_RE = /^(\d+)\.\s*([A-D])\s*$/i;
const ANSWER_KEY_HEADER_RE = /^answer\s*key\b/i;

const isAnswerKeyAnswerLine = (line: string): boolean => {
  const match = line.match(ANSWER_LINE_RE);
  if (!match) return false;
  return match[2].length === 1;
};

const letterToIndex = (letter: string): number =>
  letter.toUpperCase().charCodeAt(0) - "A".charCodeAt(0);

export const parseDocxPlainText = (rawText: string): ParsedDocxQuestion[] => {
  const lines = rawText
    .split(/\r?\n/)
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
  };

  const drafts: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;

  for (const line of questionLines) {
    const optionMatch = line.match(OPTION_LINE_RE);
    if (optionMatch) {
      if (!current) continue;
      current.options.push({
        letter: optionMatch[1].toUpperCase(),
        text: optionMatch[2].trim(),
      });
      continue;
    }

    const questionMatch = line.match(QUESTION_LINE_RE);
    if (!questionMatch) continue;

    const questionNumber = Number(questionMatch[1]);
    const questionText = questionMatch[2].trim();

    if (isAnswerKeyAnswerLine(line)) continue;

    if (current) {
      drafts.push(current);
    }

    current = {
      questionNumber,
      questionsText: questionText,
      options: [],
    };
  }

  if (current) {
    drafts.push(current);
  }

  const answers = new Map<number, string>();
  for (const line of answerLines) {
    const match = line.match(ANSWER_LINE_RE);
    if (!match) continue;
    answers.set(Number(match[1]), match[2].toUpperCase());
  }

  const results: ParsedDocxQuestion[] = [];

  for (const draft of drafts) {
    if (!draft.questionsText || draft.options.length < 2) {
      continue;
    }

    const options = draft.options.map((o) => o.text);
    const answerLetter = answers.get(draft.questionNumber);

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
