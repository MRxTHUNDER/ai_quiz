import { QuestionModel } from "../models/questions.model";

import stringSimilarity from "string-similarity";
import {
  BATCH_SIZE,
  client,
  numQuestionsEnv,
  OPENAI_MODEL,
  OPENAI_MODEL_MINI,
  SIMILARITY_THRESHOLD,
} from "../env";

const MAX_RETRIES = 3;

const BATCH_SIZE_QUESTIONS = 50; // Questions per batch
const MAX_BATCHES = 10; // Maximum number of parallel batches

const BATCH_DELAY = 5000; // 5 seconds between waves

/**
 * Extract topics/keywords from question text
 */
const extractTopics = (question: any): string[] => {
  const text = `${question.questionsText} ${question.Options.join(
    " ",
  )}`.toLowerCase();
  const topics: string[] = [];

  // Simple keyword extraction - you can enhance this with NLP libraries
  const stopWords = new Set([
    "the",
    "is",
    "at",
    "which",
    "on",
    "a",
    "an",
    "as",
    "are",
    "was",
    "were",
    "been",
    "be",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "may",
    "might",
    "must",
    "can",
    "of",
    "to",
    "in",
    "for",
    "with",
    "from",
    "by",
    "about",
  ]);

  // Extract words that are 4+ characters and not stop words
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  const uniqueWords = new Set(words.filter((word) => !stopWords.has(word)));

  // Take top 5 most common words as topics
  return Array.from(uniqueWords).slice(0, 5);
};

/**
 * Filter duplicate questions using local string similarity
 */
const filterDuplicates = async (
  candidates: any[],
  subjectId: string,
  threshold: number = SIMILARITY_THRESHOLD,
): Promise<any[]> => {
  try {
    // Get existing questions for this subject
    const existingQuestions = await QuestionModel.find({
      SubjectId: subjectId,
    }).select("questionsText");

    if (existingQuestions.length === 0) {
      console.log("No existing questions found, accepting all candidates");
      return candidates;
    }

    const existingTexts = existingQuestions
      .map((q: any) => q.questionsText)
      .filter(Boolean)
      .map((t: string) => t.toLowerCase());

    if (existingTexts.length === 0) {
      return candidates;
    }

    // Filter candidates locally
    const uniqueCandidates: any[] = [];

    for (const candidate of candidates) {
      if (!candidate.questionsText) {
        uniqueCandidates.push(candidate);
        continue;
      }

      const candidateText = candidate.questionsText.toLowerCase();

      const match = stringSimilarity.findBestMatch(
        candidateText,
        existingTexts,
      );

      if (match.bestMatch.rating >= threshold) {
        console.log(
          `\n🚫 BLOCKED DUPLICATE QUESTION (Similarity: ${(match.bestMatch.rating * 100).toFixed(1)}%)`,
        );
        console.log(`   - New: "${candidate.questionsText}"`);
        console.log(`   - Exists: "${existingTexts[match.bestMatchIndex]}"\n`);
      } else {
        uniqueCandidates.push(candidate);
      }
    }

    console.log(
      `Filtered ${
        candidates.length - uniqueCandidates.length
      } duplicate questions`,
    );
    return uniqueCandidates;
  } catch (error) {
    console.error("Error filtering duplicates:", error);
    // On error, return all candidates
    return candidates;
  }
};

/**
 * Get topic statistics for a subject to guide question generation
 */
const getTopicGuidance = async (subjectId: string): Promise<string> => {
  try {
    const topicStats = await QuestionModel.aggregate([
      { $match: { SubjectId: subjectId, topics: { $exists: true, $ne: [] } } },
      { $unwind: "$topics" },
      { $group: { _id: "$topics", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    if (topicStats.length === 0) {
      return "";
    }

    const overusedTopics = topicStats.slice(0, 5).map((t: any) => t._id);
    const underusedTopics = topicStats
      .slice(-5)
      .reverse()
      .map((t: any) => t._id);

    let guidance = "\n\nTOPIC GUIDANCE (to ensure variety):\n";
    if (overusedTopics.length > 0) {
      guidance += `- Try to AVOID these overused topics: ${overusedTopics.join(
        ", ",
      )}\n`;
    }
    if (
      underusedTopics.length > 0 &&
      underusedTopics.length < topicStats.length
    ) {
      guidance += `- FOCUS more on these underused topics: ${underusedTopics.join(
        ", ",
      )}\n`;
    }
    guidance +=
      "- Ensure questions cover different concepts and difficulty levels\n";

    return guidance;
  } catch (error) {
    console.error("Error getting topic guidance:", error);
    return "";
  }
};

/**
 * Fix common JSON issues like unescaped backslashes in LaTeX expressions
 */
const fixJsonEscaping = (jsonString: string): string => {
  let fixed = jsonString;

  // The issue: AI generates \( which is\\\$1");

  // Fix LaTeX display math delimiters: \[ and \]
  fixed = fixed.replace(/\\(\[|\])/g, "\\\\$1");

  // Fix curly braces in LaTeX: \{ and \}
  fixed = fixed.replace(/\\([{}])/g, "\\\\$1");

  return fixed;
};

/**
 * Clean JSON output by removing markdown code blocks and extra whitespace
 */
const cleanJsonOutput = (rawOutput: string): string => {
  if (!rawOutput) return rawOutput;

  let cleaned = rawOutput.trim();

  // Remove markdown code blocks (```json ... ``` or ``` ... ```)
  // Handle multiple variations
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/i, ""); // Remove opening ```json or ```
  cleaned = cleaned.replace(/\n?\s*```$/i, ""); // Remove closing ```

  // Also handle cases where there might be extra whitespace or newlines
  cleaned = cleaned.trim();

  // Try to find JSON array start if there's extra text before it
  const jsonStart = cleaned.indexOf("[");
  const jsonEnd = cleaned.lastIndexOf("]");

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }

  return cleaned.trim();
};

/**
 * Parse JSON with better error handling and recovery
 */
const parseJsonSafely = (jsonString: string): any => {
  try {
    // First try direct parsing
    return JSON.parse(jsonString);
  } catch (error: any) {
    // If that fails, try fixing common issues
    try {
      const fixed = fixJsonEscaping(jsonString);
      return JSON.parse(fixed);
    } catch (secondError) {
      // If still failing, try a more aggressive fix
      try {
        // Replace problematic LaTeX patterns more aggressively
        let aggressiveFix = jsonString;

        // Fix \( and \) patterns - these are invalid JSON escape sequences
        // Need to escape the backslash: \( becomes \\(
        aggressiveFix = aggressiveFix.replace(/\\\(/g, "\\\\(");
        aggressiveFix = aggressiveFix.replace(/\\\)/g, "\\\\)");

        // Fix \[ and \] patterns
        aggressiveFix = aggressiveFix.replace(/\\\[/g, "\\\\[");
        aggressiveFix = aggressiveFix.replace(/\\\]/g, "\\\\]");

        // Fix \{ and \} patterns
        aggressiveFix = aggressiveFix.replace(/\\\{/g, "\\\\{");
        aggressiveFix = aggressiveFix.replace(/\\\}/g, "\\\\}");

        // Fix any other backslash + special char that's not a valid escape
        // Valid JSON escapes: \", \\, \/, \b, \f, \n, \r, \t, \uXXXX
        // We want to escape backslashes before invalid escape sequences
        aggressiveFix = aggressiveFix.replace(/\\(?![\\"/bfnrtu])/g, "\\\\");

        return JSON.parse(aggressiveFix);
      } catch (thirdError) {
        // Log the error position for debugging
        if (error.message && error.message.includes("position")) {
          const match = error.message.match(/position (\d+)/);
          if (match) {
            const pos = parseInt(match[1]);
            const start = Math.max(0, pos - 50);
            const end = Math.min(jsonString.length, pos + 50);
            console.error(
              `JSON error at position ${pos}:`,
              jsonString.substring(start, end),
            );
          }
        }
        throw error; // Throw original error
      }
    }
  }
};

/**
 * Generate questions in a single batch with retry logic
 */
const generateBatch = async (
  source: string,
  batchSize: number,
  subjectId?: string,
  batchNumber?: number,
  totalBatches?: number,
  retryCount: number = 0,
  isUsingSummary: boolean = false,
  modelOverride?: string,
): Promise<any[]> => {
  const batchInfo =
    batchNumber && totalBatches
      ? ` (Batch ${batchNumber} of ${totalBatches})`
      : "";

  // Get topic guidance if subjectId is provided
  const topicGuidance = subjectId ? await getTopicGuidance(subjectId) : "";

  const baseInstructions = isUsingSummary
    ? `You are an expert COMPETITIVE ENTRANCE EXAM question generator specializing in creating high-stakes entrance examination questions. Based on the provided educational content summary, generate high-quality, ENTRANCE EXAM-LEVEL multiple-choice questions that test deep conceptual understanding, analytical thinking, and application of knowledge suitable for competitive entrance examinations.

CONTENT SUMMARY:
${source}`
    : `You are an expert COMPETITIVE ENTRANCE EXAM question generator. Analyze the provided previous year question paper from a competitive entrance examination and generate new questions that match the exact format, style, difficulty level, and question patterns typical of high-stakes competitive entrance examinations (such as NEET, JEE, CUET, CLAT, CAT, etc.).`;

  const prompt = `
${baseInstructions}

COMPETITIVE ENTRANCE EXAM QUESTION STANDARDS:
- These are ENTRANCE EXAM-LEVEL questions for competitive examinations (NEET, JEE, CUET, CLAT, CAT, etc.)
- Questions must test DEEP CONCEPTUAL UNDERSTANDING, not just memorization
- Include questions that require APPLICATION of concepts to solve complex problems
- Mix of difficulty levels: 30% easy (basic concepts), 50% medium (application), 20% challenging (advanced analysis)
- Questions should be CLEAR, UNAMBIGUOUS, and professionally worded
- Each question should test a specific concept or skill relevant to entrance exams
- Avoid trivial, overly simple, or elementary-level questions
- Include questions that require multi-step reasoning, critical thinking, and problem-solving
- Questions must match the complexity and rigor of actual competitive entrance exam questions

UNIQUENESS AND VARIETY REQUIREMENTS (CRITICAL):
- Generate UNIQUE and DIFFERENT questions - avoid repetitive patterns or similar concepts
- Ensure MAXIMUM VARIETY in topics, question types, and approaches within this batch
- Do NOT repeat similar question structures, calculations, or concepts
- Cover DIFFERENT aspects and subtopics of the subject matter
- Avoid generating questions that test the same knowledge point multiple times
- Each question should be DISTINCTLY different in its focus and approach
- Vary question formats: conceptual, analytical, calculation-based, application-based, etc.
- If generating multiple questions, ensure they complement each other rather than overlap

LANGUAGE REQUIREMENT (CRITICAL - MUST FOLLOW STRICTLY):
- By default, ALL questions, options, and answers MUST be written entirely in ENGLISH.
- CRITICAL EXCEPTION: If this is a LANGUAGE subject (any language - regional, foreign, or classical), you MUST write the ENTIRE question, ALL options, and ALL text IN THAT LANGUAGE.
- This means: If the subject is Hindi, write in Hindi (हिंदी में लिखें). If it's Urdu, write in Urdu (اردو میں لکھیں). If it's French, write in French. And so on for ANY language.
- DO NOT write questions ABOUT the language in English - write questions IN that language with native script/alphabet.
- For language subjects: questionsText must be in that language, all Options must be in that language, everything in that language's native script.
- For non-language subjects (like Science, Math, History, etc.): Always use English.
- DO NOT mix languages within a single question.

QUESTION QUALITY REQUIREMENTS:
1. Question text must be clear, concise, and grammatically correct
2. All 4 options must be plausible and well-constructed
3. Wrong options (distractors) should be common mistakes or misconceptions
4. Options should be similar in length and format when possible
5. Avoid using "All of the above" or "None of the above" unless contextually appropriate
6. For numerical questions, ensure options are in logical order (ascending/descending)
7. Questions should be solvable within 1-3 minutes for an average student
8. Include variety: conceptual questions, calculation-based, application-based, and analysis-based

CORRECT ANSWER VALIDATION (MANDATORY - VERIFY BEFORE MARKING AS CORRECT):
- BEFORE marking any option as "correctOption", you MUST verify it is factually, mathematically, and logically CORRECT
- For calculation-based questions: Work through the problem step-by-step, verify all calculations, and confirm the answer is accurate
- For conceptual questions: Verify the answer aligns with established facts, principles, and current knowledge in the field
- For application questions: Ensure the answer correctly applies the concept to the given scenario
- Double-check: The correctOption MUST be the ONLY definitively correct answer among the 4 options
- Verify: The correctOption string must EXACTLY match one of the Options (character-by-character, including spaces and punctuation)
- If you are uncertain about correctness, DO NOT mark it as correct - generate a different question instead
- This is CRITICAL: Incorrect answers marked as correct will mislead students and damage the quality of the exam

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${batchSize} questions${batchInfo}
2. Return ONLY a valid JSON array - no markdown, no explanations, no extra text
3. Start your response with [ and end with ]
4. Each question must have exactly these fields:
   - "questionsText": The question text (string) - must be clear and complete
   - "Options": An array of exactly 4 strings - all must be plausible answers
   - "correctOption": The correct answer as a string (must match one of the Options exactly)
5. VERIFICATION STEP: Before finalizing each question, verify the correctOption is actually correct by:
   - Solving/answering the question yourself
   - Checking calculations if numerical
   - Verifying facts if conceptual
   - Ensuring the answer is unambiguous and definitively correct

JSON FORMATTING RULES:
- All strings must be properly escaped for JSON
- CRITICAL MATH ESCAPING: For LaTeX or math notation, NEVER use a single backslash like "\\( " or "\\[". You MUST use DOUBLE backslashes: "\\\\" (e.g., "\\\\( x^2 \\\\)" or "\\\\[ \\\\frac{1}{2} \\\\]"). Single backslashes will cause the JSON parser to crash immediately.
- All special characters in strings must be JSON-escaped
- No trailing commas
- No comments

EXAMPLE FORMAT (High-quality entrance exam questions):
[
  {
    "questionsText": "A particle moves in a straight line with velocity v(t) = 3t² - 12t + 9 m/s. At what time does the particle come to rest?",
    "Options": ["1 s and 3 s", "2 s only", "1.5 s", "The particle never comes to rest"],
    "correctOption": "1 s and 3 s"
  },
  {
    "questionsText": "In a chemical reaction, if the rate constant doubles when temperature increases from 300K to 310K, what is the approximate activation energy? (Assume R = 8.314 J/mol·K)",
    "Options": ["53.6 kJ/mol", "107.2 kJ/mol", "26.8 kJ/mol", "214.4 kJ/mol"],
    "correctOption": "53.6 kJ/mol"
  }
]
${topicGuidance}

Return ONLY the JSON array. Do not include markdown code blocks, explanations, or any other text.
`;

  try {
    const modelToUse = modelOverride || OPENAI_MODEL;

    // Use responses API for all cases (works reliably)
    const response = await client.responses.create({
      model: modelToUse,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      temperature: isUsingSummary ? 0.7 : 0.1,
      max_output_tokens: isUsingSummary ? undefined : 6000,
    });

    if (response) {
      const usage: any = response.usage || {};
      const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
      const completionTokens =
        usage.output_tokens || usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;
      // gpt-4o costs: $2.50 / 1M input, $10.00 / 1M output
      const cost =
        (promptTokens / 1000000) * 2.5 + (completionTokens / 1000000) * 10.0;

      console.log(
        `\n📊 TOKEN USAGE (Batch ${batchNumber || 1} - ${modelToUse}):`,
      );
      console.log(`   - Input/Prompt Tokens: ${promptTokens}`);
      console.log(`   - Output/Completion Tokens: ${completionTokens}`);
      console.log(`   - Total Tokens: ${totalTokens}`);
      console.log(`   - Estimated Cost: $${cost.toFixed(4)}\n`);
    }

    const rawOutput = response.output_text || "[]";
    if (isUsingSummary) {
    }

    try {
      const cleanedOutput = cleanJsonOutput(rawOutput);
      const questions = parseJsonSafely(cleanedOutput);
      return Array.isArray(questions) ? questions : [questions];
    } catch (error) {
      console.error(
        `Failed to parse AI output for batch ${batchNumber || 1}:`,
        error,
      );
      console.log("Raw output (first 500 chars):", rawOutput.substring(0, 500));
      return [];
    }
  } catch (error: any) {
    if (
      error?.code === "context_length_exceeded" ||
      error?.error?.code === "context_length_exceeded" ||
      error?.message?.includes("context window")
    ) {
      console.error(
        `Context window exceeded for batch ${
          batchNumber || 1
        } with ${batchSize} questions`,
      );

      if (batchSize > 5 && retryCount < MAX_RETRIES) {
        const reducedBatchSize = Math.max(5, Math.floor(batchSize / 2));
        console.log(
          `Retrying batch ${
            batchNumber || 1
          } with reduced size: ${reducedBatchSize} questions (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`,
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return await generateBatch(
          source,
          reducedBatchSize,
          subjectId,
          batchNumber,
          totalBatches,
          retryCount + 1,
          isUsingSummary,
          modelOverride,
        );
      } else {
        console.error(
          `Cannot reduce batch size further or max retries reached for batch ${
            batchNumber || 1
          }`,
        );
        return [];
      }
    }

    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(
        `Retrying batch ${batchNumber || 1} after ${delay}ms (attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return await generateBatch(
        source,
        batchSize,
        subjectId,
        batchNumber,
        totalBatches,
        retryCount + 1,
        isUsingSummary,
        modelOverride,
      );
    }

    console.error(`Error generating batch ${batchNumber || 1}:`, error);
    return [];
  }
};

export const GenerateAIQuestions = async (
  source: string,
  numQuestions?: number,
  subjectId?: string,
  isUsingSummary: boolean = false,
  modelOverride?: string,
) => {
  const modelToUse = modelOverride || OPENAI_MODEL;
  const finalNumQuestions =
    numQuestions || (numQuestionsEnv ? Number(numQuestionsEnv) : 50);

  if (!finalNumQuestions || finalNumQuestions <= 0) {
    const prompt = `
You are an expert COMPETITIVE ENTRANCE EXAM question generator specializing in high-stakes entrance examinations. Analyze the provided previous year question paper from a competitive entrance examination and generate new questions that match the exact format, style, difficulty level, and question patterns typical of competitive entrance examinations (such as NEET, JEE, CUET, CLAT, CAT, etc.).

LANGUAGE REQUIREMENT (CRITICAL - MUST FOLLOW STRICTLY):
- By default, ALL questions, options, and answers MUST be written entirely in ENGLISH.
- CRITICAL EXCEPTION: If this is a LANGUAGE subject (any language - regional, foreign, or classical), you MUST write the ENTIRE question, ALL options, and ALL text IN THAT LANGUAGE.
- This means: If the subject is Hindi, write in Hindi (हिंदी में लिखें). If it's Urdu, write in Urdu (اردو میں لکھیں). If it's French, write in French. And so on for ANY language.
- DO NOT write questions ABOUT the language in English - write questions IN that language with native script/alphabet.
- For language subjects: questionsText must be in that language, all Options must be in that language, everything in that language's native script.
- For non-language subjects (like Science, Math, History, etc.): Always use English.
- DO NOT mix languages within a single question.

COMPETITIVE ENTRANCE EXAM QUESTION STANDARDS:
- Questions must test CONCEPTUAL UNDERSTANDING, not just memorization
- Include questions that require APPLICATION of concepts to solve complex problems
- Mix of difficulty levels: 30% easy (basic concepts), 50% medium (application), 20% challenging (advanced analysis)
- Questions should be CLEAR, UNAMBIGUOUS, and professionally worded
- Each question should test a specific concept or skill relevant to entrance exams
- Avoid trivial, overly simple, or elementary-level questions
- Include questions that require multi-step reasoning, critical thinking, and problem-solving
- Questions must match the complexity and rigor of actual competitive entrance exam questions

UNIQUENESS AND VARIETY REQUIREMENTS (CRITICAL):
- Generate UNIQUE and DIFFERENT questions - avoid repetitive patterns or similar concepts
- Ensure MAXIMUM VARIETY in topics, question types, and approaches
- Do NOT repeat similar question structures, calculations, or concepts
- Cover DIFFERENT aspects and subtopics of the subject matter
- Avoid generating questions that test the same knowledge point multiple times
- Each question should be DISTINCTLY different in its focus and approach
- Vary question formats: conceptual, analytical, calculation-based, application-based, etc.
- Ensure questions complement each other rather than overlap in content or methodology

QUESTION QUALITY REQUIREMENTS:
1. Question text must be clear, concise, and grammatically correct
2. All 4 options must be plausible and well-constructed
3. Wrong options (distractors) should be common mistakes or misconceptions
4. Options should be similar in length and format when possible
5. Avoid using "All of the above" or "None of the above" unless contextually appropriate
6. For numerical questions, ensure options are in logical order (ascending/descending)
7. Questions should be solvable within 1-3 minutes for an average student
8. Include variety: conceptual questions, calculation-based, application-based, and analysis-based

CORRECT ANSWER VALIDATION (MANDATORY - VERIFY BEFORE MARKING AS CORRECT):
- BEFORE marking any option as "correctOption", you MUST verify it is factually, mathematically, and logically CORRECT
- For calculation-based questions: Work through the problem step-by-step, verify all calculations, and confirm the answer is accurate
- For conceptual questions: Verify the answer aligns with established facts, principles, and current knowledge in the field
- For application questions: Ensure the answer correctly applies the concept to the given scenario
- Double-check: The correctOption MUST be the ONLY definitively correct answer among the 4 options
- Verify: The correctOption string must EXACTLY match one of the Options (character-by-character, including spaces and punctuation)
- If you are uncertain about correctness, DO NOT mark it as correct - generate a different question instead
- This is CRITICAL: Incorrect answers marked as correct will mislead students and damage the quality of the exam

CRITICAL REQUIREMENTS:
1. Generate the same number of questions as in the provided PDF
2. Return ONLY a valid JSON array - no markdown, no explanations, no extra text
3. Start your response with [ and end with ]
4. Each question must have exactly these fields:
   - "questionsText": The question text (string) - must be clear and complete
   - "Options": An array of exactly 4 strings - all must be plausible answers
   - "correctOption": The correct answer as a string (must match one of the Options exactly)
5. VERIFICATION STEP: Before finalizing each question, verify the correctOption is actually correct by:
   - Solving/answering the question yourself
   - Checking calculations if numerical
   - Verifying facts if conceptual
   - Ensuring the answer is unambiguous and definitively correct

JSON FORMATTING RULES:
- All strings must be properly escaped for JSON
- CRITICAL MATH ESCAPING: For LaTeX or math notation, NEVER use a single backslash like "\\( " or "\\[". You MUST use DOUBLE backslashes: "\\\\" (e.g., "\\\\( x^2 \\\\)" or "\\\\[ \\\\frac{1}{2} \\\\]"). Single backslashes will cause the JSON parser to crash immediately.
- All special characters in strings must be JSON-escaped
- No trailing commas
- No comments

EXAMPLE FORMAT (High-quality entrance exam questions):
[
  {
    "questionsText": "A particle moves in a straight line with velocity v(t) = 3t² - 12t + 9 m/s. At what time does the particle come to rest?",
    "Options": ["1 s and 3 s", "2 s only", "1.5 s", "The particle never comes to rest"],
    "correctOption": "1 s and 3 s"
  },
  {
    "questionsText": "In a chemical reaction, if the rate constant doubles when temperature increases from 300K to 310K, what is the approximate activation energy? (Assume R = 8.314 J/mol·K)",
    "Options": ["53.6 kJ/mol", "107.2 kJ/mol", "26.8 kJ/mol", "214.4 kJ/mol"],
    "correctOption": "53.6 kJ/mol"
  }
]

Return ONLY the JSON array. Do not include markdown code blocks, explanations, or any other text.
`;

    const response = await client.responses.create({
      model: modelToUse,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${prompt}\n\nCONTENT:\n${source}` },
          ],
        },
      ],
      temperature: isUsingSummary ? 0.7 : 0.1,
      max_output_tokens: isUsingSummary ? undefined : 6000,
    });

    if (response) {
      const usage: any = response.usage || {};
      const promptTokens = usage.input_tokens || usage.prompt_tokens || 0;
      const completionTokens =
        usage.output_tokens || usage.completion_tokens || 0;
      const totalTokens = usage.total_tokens || promptTokens + completionTokens;
      // gpt-4o costs: $2.50 / 1M input, $10.00 / 1M output
      const cost =
        (promptTokens / 1000000) * 2.5 + (completionTokens / 1000000) * 10.0;

      console.log(`\n📊 TOKEN USAGE (Single Batch - ${modelToUse}):`);
      console.log(`   - Input/Prompt Tokens: ${promptTokens}`);
      console.log(`   - Output/Completion Tokens: ${completionTokens}`);
      console.log(`   - Total Tokens: ${totalTokens}`);
      console.log(`   - Estimated Cost: $${cost.toFixed(4)}\n`);
    }

    const rawOutput = response.output_text || "[]";
    if (isUsingSummary) {
    }

    try {
      // Clean the output to remove markdown code blocks
      const cleanedOutput = cleanJsonOutput(rawOutput);
      // Parse with enhanced error handling
      const questions = parseJsonSafely(cleanedOutput);
      return Array.isArray(questions) ? questions : [questions];
    } catch (error) {
      console.error("Failed to parse AI output:", error);
      console.log("Raw output (first 500 chars):", rawOutput.substring(0, 500));
      return [];
    }
  }

  // Batch processing for all requests (parallel)
  if (finalNumQuestions <= BATCH_SIZE_QUESTIONS) {
    // Small enough for single batch
    const questions = await generateBatch(
      source,
      finalNumQuestions,
      subjectId,
      undefined,
      undefined,
      0,
      isUsingSummary,
      modelOverride,
    );

    // Add topics (removed embedding)
    const questionsWithTopics = questions.map((q: any) => ({
      ...q,
      topics: extractTopics(q),
    }));

    // Filter duplicates if subjectId is provided
    if (subjectId) {
      return await filterDuplicates(questionsWithTopics, subjectId);
    }

    return questionsWithTopics;
  }

  // Calculate batches
  const currentBatchSize = BATCH_SIZE_QUESTIONS;
  const totalBatches = Math.ceil(finalNumQuestions / currentBatchSize);
  const totalWaves = Math.ceil(totalBatches / MAX_BATCHES);
  
  console.log(
    `Generating ${finalNumQuestions} questions in ${totalBatches} batches (${currentBatchSize} questions/batch) across ${totalWaves} wave(s) (max ${MAX_BATCHES} parallel batches per wave)`,
  );
  
  const allQuestions: any[] = [];
  
  // Process batches in waves (max MAX_BATCHES parallel at a time)
  for (let wave = 0; wave < totalWaves; wave++) {
    const startBatch = wave * MAX_BATCHES;
    const endBatch = Math.min(startBatch + MAX_BATCHES, totalBatches);
    const batchesInWave = endBatch - startBatch;
    
    console.log(`\n🌊 Wave ${wave + 1}/${totalWaves}: Running batches ${startBatch + 1}-${endBatch} in parallel...`);
    
    const batchPromises: Promise<{batchNumber: number, questions: any[]}>[] = [];
    
    // Create batch promises for this wave
    for (let i = startBatch; i < endBatch; i++) {
      const questionsProcessed = i * currentBatchSize;
      const remainingQuestions = finalNumQuestions - questionsProcessed;
      const actualBatchSize = Math.min(currentBatchSize, remainingQuestions);
      const currentBatchNumber = i + 1;

      const batchPromise = generateBatch(
        source,
        actualBatchSize,
        subjectId,
        currentBatchNumber,
        totalBatches,
        0,
        isUsingSummary,
        modelOverride,
      ).then((questions) => ({
        batchNumber: currentBatchNumber,
        questions: questions || []
      })).catch((error) => {
        console.error(`Batch ${currentBatchNumber} failed:`, error);
        return {
          batchNumber: currentBatchNumber,
          questions: []
        };
      });

      batchPromises.push(batchPromise);
    }

    // Wait for all batches in this wave to complete
    const batchResults = await Promise.allSettled(batchPromises);

    // Process results from this wave
    for (const result of batchResults) {
      if (result.status === 'fulfilled' && result.value.questions.length > 0) {
        const { batchNumber, questions } = result.value;
        
        // Add topics
        const questionsWithTopics = questions.map((q: any) => ({
          ...q,
          topics: extractTopics(q),
        }));

        // Filter duplicates if subjectId is provided
        let finalQuestions = questionsWithTopics;
        if (subjectId) {
          finalQuestions = await filterDuplicates(questionsWithTopics, subjectId);
        }

        if (finalQuestions.length > 0) {
          allQuestions.push(...finalQuestions);
          console.log(
            `Batch ${batchNumber} completed: ${finalQuestions.length} questions added (Total: ${allQuestions.length}/${finalNumQuestions})`,
          );
        } else {
          console.warn(
            `Batch ${batchNumber} had no unique questions after deduplication`,
          );
        }
      } else if (result.status === 'rejected') {
        console.error('Batch promise was rejected:', result.reason);
      }
    }
    
    console.log(`✅ Wave ${wave + 1} complete: ${allQuestions.length}/${finalNumQuestions} questions generated so far`);

    if (wave < totalWaves - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next wave...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(
    `Question generation complete: ${allQuestions.length} questions generated (requested: ${finalNumQuestions})`,
  );

  return allQuestions;
};
