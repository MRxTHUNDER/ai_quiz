import { BATCH_SIZE, client, MAX_RETRIES, OPENAI_MODEL_MINI } from "../env";
import { tryParseJsonWithRepair } from "../utils/jsonParseWithRepair";

const BATCH_SIZE_QUESTIONS = 20; // Questions per batch (smaller batches for more reliable JSON)
const MAX_BATCHES = 10; // Maximum number of parallel batches per wave
const BATCH_DELAY = 5000; // 5 seconds between waves
/** Cap top-up rounds after waves so a stuck model cannot loop forever */
const MAX_SUBJECT_TOP_UP_ROUNDS = 80;

const fixJsonEscaping = (jsonString: string): string => {
  let fixed = jsonString;

  fixed = fixed.replace(/\\\(/g, "\\\\(");
  fixed = fixed.replace(/\\\)/g, "\\\\)");

  fixed = fixed.replace(/\\(\[|\])/g, "\\\\$1");

  fixed = fixed.replace(/\\([{}])/g, "\\\\$1");

  return fixed;
};

const normalizeCommonJsonIssues = (jsonString: string): string => {
  let normalized = fixJsonEscaping(jsonString);

  normalized = normalized.replace(
    /([\[,\s])(\+?\-?\d+(?:\.\d+)?)(")/g,
    '$1"$2$3',
  );

  normalized = normalized.replace(
    /([\[,\s])(\+?\-?\d+(?:\.\d+)?)(\s*[\],])/g,
    '$1"$2"$3',
  );

  normalized = normalized.replace(/\\(?![\\"/bfnrtu])/g, "\\\\");

  return normalized;
};

const cleanJsonOutput = (rawOutput: string): string => {
  if (!rawOutput) return rawOutput;

  let cleaned = rawOutput.trim();

  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?\s*```$/i, "");

  cleaned = cleaned.trim();

  const jsonStart = cleaned.indexOf("[");
  const jsonEnd = cleaned.lastIndexOf("]");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned.trim();
};

const superscriptSubscriptMap: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
};

const symbolMap: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "↑": "up",
  "↓": "down",
  "∫": "int",
  "∂": "d",
  "√": "sqrt",
  "∑": "sum",
  "∞": "inf",
  "±": "+/-",
  "≈": "~",
  "≠": "!=",
  "≤": "<=",
  "≥": ">=",
  "⋅": "*",
  π: "pi",
  α: "alpha",
  β: "beta",
  γ: "gamma",
  δ: "delta",
  θ: "theta",
  λ: "lambda",
  μ: "mu",
  σ: "sigma",
  ω: "omega",
};

const normalizeStemText = (str: string): string => {
  return str
    .replace(/\\[a-zA-Z]+?\([^)]*?\)/g, (match) => match.replace(/\\./g, "_"))
    .replace(
      /[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉½¼¾]/g,
      (char) => superscriptSubscriptMap[char] || char,
    )
    .replace(
      /[→←↔↑↓∫∂√∑∞±≈≠≤≥⋅παβγδθλμσω]/g,
      (char) => symbolMap[char] || char,
    );
};

/** Last resort: normalize unicode, unquoted keys, then parse (may alter LaTeX). */
const parseJsonWithLegacyHeuristics = (jsonString: string): any => {
  const normalized = normalizeStemText(jsonString)
    .replace(/\\(?![\\"/bfnrtu])/g, "\\\\")
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*?)\s*:/g, '$1"$2":')
    .replace(/,\s*([\]}])/g, "$1")
    .trim();

  try {
    return tryParseJsonWithRepair(normalized);
  } catch (error: any) {
    const arrayMatch = normalized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return tryParseJsonWithRepair(arrayMatch[0]);
      } catch {
        /* continue */
      }
    }

    const objectLines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{") && line.endsWith("}"));

    const validObjects = objectLines
      .map((line) => {
        try {
          return tryParseJsonWithRepair(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (validObjects.length > 0) {
      return validObjects;
    }

    if (error.message && error.message.includes("position")) {
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1], 10);
        const start = Math.max(0, pos - 50);
        const end = Math.min(jsonString.length, pos + 50);
        console.error(
          `JSON error at position ${pos}:`,
          jsonString.substring(start, end),
        );
      }
    }

    throw error;
  }
};

const parseJsonSafely = (jsonString: string): any => {
  try {
    return tryParseJsonWithRepair(jsonString);
  } catch {
    return parseJsonWithLegacyHeuristics(jsonString);
  }
};

const extractJsonArrayCandidate = (content: string): string => {
  const match = content.match(/\[[\s\S]*\]/);
  return match ? match[0] : content;
};

const extractJsonObjectsFromArray = (jsonString: string): string[] => {
  const objects: string[] = [];
  let depth = 0;
  let startIndex = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < jsonString.length; index++) {
    const char = jsonString[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        startIndex = index;
      }
      depth++;
      continue;
    }

    if (char === "}") {
      depth--;
      if (depth === 0 && startIndex !== -1) {
        objects.push(jsonString.slice(startIndex, index + 1));
        startIndex = -1;
      }
    }
  }

  return objects;
};

const recoverQuestionsFromMalformedArray = (jsonString: string): any[] => {
  const objectSnippets = extractJsonObjectsFromArray(jsonString);
  const recoveredQuestions: any[] = [];

  for (const objectSnippet of objectSnippets) {
    try {
      const parsed = parseJsonSafely(objectSnippet);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.questionsText === "string" &&
        Array.isArray(parsed.Options) &&
        typeof parsed.correctOption === "string"
      ) {
        recoveredQuestions.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return recoveredQuestions;
};

const generateBatchFromSubject = async (
  subjectName: string,
  entranceExamName: string,
  numQuestions: number,
  topic?: string,
  batchNumber?: number,
): Promise<any[]> => {
  let content = "[]";
  try {
    const topicText = topic
      ? `\nFOCUS TOPIC: ${topic}\nGenerate all questions specifically about: ${topic}`
      : "";

    const prompt = `
You are an expert question generator for competitive entrance examinations, writing at the level of real ${entranceExamName} papers (high-stakes, nationally competitive standard).

TASK:
- Generate EXACTLY ${numQuestions} multiple-choice questions for the subject: ${subjectName}${topicText}
- Each question must be an object with: "questionsText", "Options" (array of exactly 4 strings), and "correctOption" (a string equal to one of the Options).

LANGUAGE:
- Use ENGLISH for all text, unless the subject name "${subjectName}" clearly indicates a language subject; in that case, write everything in that language.
- Do NOT mix languages in a single question.

DIFFICULTY STANDARD (ENTRANCE-LEVEL):
- Target top-tier competitive exam quality: deep conceptual understanding, multi-step reasoning, and application—not textbook recall or obvious formula plug-in.
- Prefer questions where the student must choose the right idea, connect concepts, or interpret a non-obvious situation.
- Avoid questions that only test a definition in isolation with no reasoning.

DIFFICULTY DISTRIBUTION (across this batch):
- ~30% Easy: solid concept clarity, still require a clear reasoning step (not guessable trivia).
- ~50% Medium: apply concepts in standard exam-style ways (short chains of reasoning).
- ~20% Hard: multi-step reasoning, combining ideas, or carefully designed non-obvious cases (still fair and unambiguous).

REASONING AND OPTIONS:
- For most questions, the stem should require at least two meaningful conceptual or logical steps (or one substantial step with real discrimination)—avoid a steady diet of trivial one-liners unless the "short stem" slot intentionally tests a crisp idea.
- Include at least one plausible wrong option that reflects a common mistake or misconception (distractor quality matters as much as the stem).
- Wording must be fair and unambiguous; "hard" means intellectually demanding, not vague or trick-based.

NUMERICAL QUALITY (when numbers appear):
- Use realistic values and relationships; avoid cartoonishly simple numbers unless the point is conceptual.
- Do not add heavy arithmetic for its own sake; difficulty should come from reasoning, not busywork.

STEM LENGTH AND DEPTH (CRITICAL — LIKE REAL ENTRANCE PAPERS):
- Do NOT default to one-line stems only. Real exams use short, medium, AND long questions.
- Across this batch, aim for a mix roughly: ~25% short (single line, direct), ~50% medium (2–4 sentences, brief setup, given data, or a small scenario), ~25% long (paragraph-style or multi-step: passage, case, several given quantities, "consider the following...", assertion–reason, reading comprehension, or multi-part setup before the final ask).
- Longer stems must still be ONE question with exactly one best answer among the four options.
- Vary structure: include some questions that need reading and reasoning, not only formula plug-in.

VARIETY:
- Cover different topics within ${subjectName}${
      topic ? " with emphasis on " + topic : ""
    }.
- Each question should test a distinct idea or angle; avoid repeating patterns, recycled numbers, or parallel templates.

QUALITY:
- All four options must be plausible; wrong options should tempt someone who misread or misapplied the concept.
- For numeric questions, keep options in a sensible order and similar presentation where appropriate.

CORRECTNESS:
- Solve every question yourself before choosing "correctOption".
- "correctOption" must be the ONLY fully correct answer and must exactly match one of the strings in "Options".

OUTPUT FORMAT (IMPORTANT — VALID JSON ONLY):
- Return ONLY one JSON array. No markdown code fences, no text before [ or after ], no comments.
- Every string must use double quotes; escape internal quotes as \\".
- You MAY use LaTeX in "questionsText" and "Options". In the JSON file each backslash must be doubled: use \\\\( and \\\\) for inline math, \\\\[ and \\\\] for display (e.g. "\\\\( \\\\frac{1}{2} \\\\)"). A single \\ before ( or frac will break JSON.parse.
- Prefer LaTeX with proper JSON escaping over raw unicode math symbols.
- No trailing commas; no single-quoted strings.

MINIMAL SCHEMA (follow exactly):
[
  {
    "questionsText": "string",
    "Options": ["string", "string", "string", "string"],
    "correctOption": "string (must equal one Options entry exactly)"
  }
]

EXAMPLE (plain text question):
[
  {
    "questionsText": "Example question text here.",
    "Options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": "Option B"
  }
]

EXAMPLE (math — note doubled backslashes in JSON for LaTeX):
[
  {
    "questionsText": "If \\\\(f(x) = x^2\\\\), what is \\\\(f'(0)\\\\)?",
    "Options": ["\\\\(0\\\\)", "\\\\(1\\\\)", "\\\\(2\\\\)", "\\\\(-1\\\\)"],
    "correctOption": "\\\\(0\\\\)"
  }
]

Return ONLY the JSON array.`;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const response = await client.responses.create({
        model: OPENAI_MODEL_MINI,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }],
          },
        ],
        temperature: 0.1,
        max_output_tokens: 15000,
      });

      content = response.output_text || "[]";

      if (response) {
        const usage: any = response.usage || {};
        const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
        const completionTokens =
          usage.output_tokens || usage.completion_tokens || 0;
        const totalTokens =
          usage.total_tokens || promptTokens + completionTokens;
        const cost =
          (promptTokens / 1000000) * 0.15 + (completionTokens / 1000000) * 0.6;

        console.log(
          `\n📊 TOKEN USAGE (Batch ${batchNumber || 1} - gpt-4o-mini):`,
        );
        console.log(`   - Input/Prompt Tokens: ${promptTokens}`);
        console.log(`   - Output/Completion Tokens: ${completionTokens}`);
        console.log(`   - Total Tokens: ${totalTokens}`);
        console.log(`   - Estimated Cost: $${cost.toFixed(6)}\n`);
      }

      const cleanedContent = extractJsonArrayCandidate(
        cleanJsonOutput(content),
      );

      let questions: any[] = [];
      try {
        const parsedQuestions = parseJsonSafely(cleanedContent);
        questions = Array.isArray(parsedQuestions) ? parsedQuestions : [];
      } catch (parseError: any) {
        questions = recoverQuestionsFromMalformedArray(cleanedContent);
        if (questions.length === 0) {
          console.warn(
            `Retry ${attempt + 1}/${MAX_RETRIES} for batch ${
              batchNumber || 1
            } due to parse issue: ${parseError?.message || "unknown parse error"}`,
          );

          if (attempt < MAX_RETRIES - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 * (attempt + 1)),
            );
            continue;
          }

          throw parseError;
        }

        console.warn(
          `Recovered ${questions.length} valid questions from malformed batch ${
            batchNumber || 1
          } output`,
        );
      }

      console.log(
        `Batch ${batchNumber || 1}: Generated ${
          questions.length
        } questions from subject knowledge (${subjectName})`,
      );

      return Array.isArray(questions) ? questions : [];
    }

    return [];
  } catch (error) {
    console.error(`Error generating batch ${batchNumber || 1}:`, error);
    console.log("Raw output (first 500 chars):", content?.substring(0, 500));
    return [];
  }
};

export const GenerateQuestionsFromSubjectKnowledge = async (
  subjectName: string,
  entranceExamName: string,
  numQuestions: number = 10,
  topic?: string,
): Promise<any[]> => {
  // If requesting fewer questions than batch size, do single batch
  if (numQuestions <= BATCH_SIZE_QUESTIONS) {
    return await generateBatchFromSubject(
      subjectName,
      entranceExamName,
      numQuestions,
      topic,
      1,
    );
  }

  // Calculate batches for parallel processing
  const currentBatchSize = BATCH_SIZE_QUESTIONS;
  const totalBatches = Math.ceil(numQuestions / currentBatchSize);
  const totalWaves = Math.ceil(totalBatches / MAX_BATCHES);

  console.log(
    `Generating ${numQuestions} questions in ${totalBatches} batches (${currentBatchSize} questions/batch) across ${totalWaves} wave(s) (max ${MAX_BATCHES} parallel batches per wave) - ${subjectName} (${entranceExamName})`,
  );

  const allQuestions: any[] = [];

  // Process batches in waves (max MAX_BATCHES parallel at a time)
  for (let wave = 0; wave < totalWaves; wave++) {
    const startBatch = wave * MAX_BATCHES;
    const endBatch = Math.min(startBatch + MAX_BATCHES, totalBatches);
    const batchesInWave = endBatch - startBatch;

    console.log(
      `\n🌊 Wave ${wave + 1}/${totalWaves}: Running batches ${startBatch + 1}-${endBatch} in parallel...`,
    );

    const batchPromises: Promise<{ batchNumber: number; questions: any[] }>[] =
      [];

    // Create batch promises for this wave
    for (let i = startBatch; i < endBatch; i++) {
      const questionsProcessed = i * currentBatchSize;
      const remainingQuestions = numQuestions - questionsProcessed;
      const actualBatchSize = Math.min(currentBatchSize, remainingQuestions);
      const currentBatchNumber = i + 1;

      const batchPromise = generateBatchFromSubject(
        subjectName,
        entranceExamName,
        actualBatchSize,
        topic,
        currentBatchNumber,
      )
        .then((questions) => ({
          batchNumber: currentBatchNumber,
          questions: questions || [],
        }))
        .catch((error) => {
          console.error(`Batch ${currentBatchNumber} failed:`, error);
          return {
            batchNumber: currentBatchNumber,
            questions: [],
          };
        });

      batchPromises.push(batchPromise);
    }

    // Wait for all batches in this wave to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results from this wave
    for (const result of batchResults) {
      if (result.status === "fulfilled" && result.value.questions.length > 0) {
        const { batchNumber, questions } = result.value;

        allQuestions.push(...questions);
        console.log(
          `Batch ${batchNumber} completed: ${questions.length} questions added (Total: ${allQuestions.length}/${numQuestions})`,
        );
      } else if (result.status === "rejected") {
        console.error("Batch promise was rejected:", result.reason);
      } else if (
        result.status === "fulfilled" &&
        result.value.questions.length === 0
      ) {
        console.warn(`Batch ${result.value.batchNumber} returned no questions`);
      }
    }

    console.log(
      `✅ Wave ${wave + 1} complete: ${allQuestions.length}/${numQuestions} questions generated so far`,
    );

    if (wave < totalWaves - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next wave...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // If we are short of the requested count, keep requesting batches until we reach it
  // or we stall / hit MAX_SUBJECT_TOP_UP_ROUNDS.
  let topUpRound = 0;
  while (
    allQuestions.length < numQuestions &&
    topUpRound < MAX_SUBJECT_TOP_UP_ROUNDS
  ) {
    const remainingNeeded = numQuestions - allQuestions.length;
    if (remainingNeeded <= 0) {
      break;
    }

    topUpRound += 1;
    console.log(
      `Top-up ${topUpRound}/${MAX_SUBJECT_TOP_UP_ROUNDS}: generating ${remainingNeeded} more toward ${numQuestions} (${subjectName} - ${entranceExamName})`,
    );

    try {
      const extraQuestions = await generateBatchFromSubject(
        subjectName,
        entranceExamName,
        remainingNeeded,
        topic,
        totalBatches + topUpRound,
      );

      if (!extraQuestions?.length) {
        console.warn(
          `Top-up ${topUpRound} returned no questions; stopping subject fill.`,
        );
        break;
      }

      allQuestions.push(...extraQuestions);
      console.log(
        `Top-up ${topUpRound} added ${extraQuestions.length} questions (Total: ${allQuestions.length}/${numQuestions})`,
      );
    } catch (error) {
      console.error(
        "Error generating additional questions in GenerateQuestionsFromSubject:",
        error,
      );
      break;
    }
  }

  console.log(
    `Completed: ${allQuestions.length} total questions generated (${subjectName} - ${entranceExamName})`,
  );

  return allQuestions;
};
