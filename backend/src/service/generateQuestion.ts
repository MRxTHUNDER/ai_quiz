import OpenAI from "openai";
import dotenv from "dotenv";
import { QuestionModel } from "../models/questions.model";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = process.env.QUESTION_BATCH_SIZE
  ? Number(process.env.QUESTION_BATCH_SIZE)
  : 10;

const MAX_RETRIES = 3;

const BATCH_DELAY = 2000; // 2 seconds

const SIMILARITY_THRESHOLD = Number(
  process.env.DUPLICATE_SIMILARITY_THRESHOLD || 0.85
);

const generateEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
};

/**
 * Calculate cosine similarity between two vectors
 */
const cosineSimilarity = (vec1: number[], vec2: number[]): number => {
  if (vec1.length !== vec2.length || vec1.length === 0) return 0;

  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    mag1 += vec1[i] * vec1[i];
    mag2 += vec2[i] * vec2[i];
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
};

/**
 * Extract topics/keywords from question text
 */
const extractTopics = (question: any): string[] => {
  const text = `${question.questionsText} ${question.Options.join(
    " "
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
 * Filter duplicate questions using embedding similarity
 */
const filterDuplicates = async (
  candidates: any[],
  subjectId: string,
  threshold: number = SIMILARITY_THRESHOLD
): Promise<any[]> => {
  try {
    // Get existing questions for this subject with embeddings
    const existingQuestions = await QuestionModel.find({
      SubjectId: subjectId,
      embedding: { $exists: true, $ne: null },
    }).select("embedding");

    if (existingQuestions.length === 0) {
      // No existing questions, all candidates are unique
      console.log(
        "No existing questions with embeddings, accepting all candidates"
      );
      return candidates;
    }

    const existingEmbeddings = existingQuestions
      .map((q: any) => q.embedding)
      .filter((emb: any) => emb && emb.length > 0);

    if (existingEmbeddings.length === 0) {
      return candidates;
    }

    // Filter candidates based on similarity
    const uniqueCandidates: any[] = [];

    for (const candidate of candidates) {
      if (!candidate.embedding || candidate.embedding.length === 0) {
        // If embedding generation failed, skip this candidate
        console.warn("Candidate has no embedding, skipping");
        continue;
      }

      // Check similarity with all existing questions
      let isDuplicate = false;
      for (const existingEmb of existingEmbeddings) {
        const similarity = cosineSimilarity(candidate.embedding, existingEmb);
        if (similarity >= threshold) {
          isDuplicate = true;
          console.log(
            `Duplicate detected with similarity ${similarity.toFixed(3)}`
          );
          break;
        }
      }

      if (!isDuplicate) {
        uniqueCandidates.push(candidate);
      }
    }

    console.log(
      `Filtered ${
        candidates.length - uniqueCandidates.length
      } duplicate questions`
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
        ", "
      )}\n`;
    }
    if (
      underusedTopics.length > 0 &&
      underusedTopics.length < topicStats.length
    ) {
      guidance += `- FOCUS more on these underused topics: ${underusedTopics.join(
        ", "
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
              jsonString.substring(start, end)
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
  isUsingSummary: boolean = false
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

QUESTION QUALITY REQUIREMENTS:
1. Question text must be clear, concise, and grammatically correct
2. All 4 options must be plausible and well-constructed
3. Wrong options (distractors) should be common mistakes or misconceptions
4. Options should be similar in length and format when possible
5. Avoid using "All of the above" or "None of the above" unless contextually appropriate
6. For numerical questions, ensure options are in logical order (ascending/descending)
7. Questions should be solvable within 1-3 minutes for an average student
8. Include variety: conceptual questions, calculation-based, application-based, and analysis-based

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${batchSize} questions${batchInfo}
2. Return ONLY a valid JSON array - no markdown, no explanations, no extra text
3. Start your response with [ and end with ]
4. Each question must have exactly these fields:
   - "questionsText": The question text (string) - must be clear and complete
   - "Options": An array of exactly 4 strings - all must be plausible answers
   - "correctOption": The correct answer as a string (must match one of the Options exactly)

JSON FORMATTING RULES:
- All strings must be properly escaped for JSON
- If using mathematical notation or LaTeX, escape backslashes properly: use \\\\ for a single backslash
- Example: "f(x) = x^2" is fine, but "f(x) = \\frac{1}{2}" needs double backslashes: "f(x) = \\\\frac{1}{2}"
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
    // Use responses API for all cases (works reliably)
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      temperature: 0.7,
    });

    if (response) {
      console.log(
        `Batch ${batchNumber || 1} - Tokens used:`,
        response?.usage?.total_tokens
      );
    }

    const rawOutput = response.output_text || "[]";

    try {
      const cleanedOutput = cleanJsonOutput(rawOutput);
      const questions = parseJsonSafely(cleanedOutput);
      return Array.isArray(questions) ? questions : [questions];
    } catch (error) {
      console.error(
        `Failed to parse AI output for batch ${batchNumber || 1}:`,
        error
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
        } with ${batchSize} questions`
      );

      if (batchSize > 5 && retryCount < MAX_RETRIES) {
        const reducedBatchSize = Math.max(5, Math.floor(batchSize / 2));
        console.log(
          `Retrying batch ${
            batchNumber || 1
          } with reduced size: ${reducedBatchSize} questions (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
        return await generateBatch(
          source,
          reducedBatchSize,
          subjectId,
          batchNumber,
          totalBatches,
          retryCount + 1,
          isUsingSummary
        );
      } else {
        console.error(
          `Cannot reduce batch size further or max retries reached for batch ${
            batchNumber || 1
          }`
        );
        return [];
      }
    }

    if (retryCount < MAX_RETRIES) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
      console.log(
        `Retrying batch ${batchNumber || 1} after ${delay}ms (attempt ${
          retryCount + 1
        }/${MAX_RETRIES})`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return await generateBatch(
        source,
        batchSize,
        subjectId,
        batchNumber,
        totalBatches,
        retryCount + 1,
        isUsingSummary
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
  isUsingSummary: boolean = false
) => {
  const numQuestionsEnv = process.env.NUM_QUESTIONS;
  const finalNumQuestions =
    numQuestions || (numQuestionsEnv ? Number(numQuestionsEnv) : 50);

  if (!finalNumQuestions || finalNumQuestions <= 0) {
    const prompt = `
You are an expert COMPETITIVE ENTRANCE EXAM question generator specializing in high-stakes entrance examinations. Analyze the provided previous year question paper from a competitive entrance examination and generate new questions that match the exact format, style, difficulty level, and question patterns typical of competitive entrance examinations (such as NEET, JEE, CUET, CLAT, CAT, etc.).

COMPETITIVE ENTRANCE EXAM QUESTION STANDARDS:
- Questions must test CONCEPTUAL UNDERSTANDING, not just memorization
- Include questions that require APPLICATION of concepts to solve complex problems
- Mix of difficulty levels: 30% easy (basic concepts), 50% medium (application), 20% challenging (advanced analysis)
- Questions should be CLEAR, UNAMBIGUOUS, and professionally worded
- Each question should test a specific concept or skill relevant to entrance exams
- Avoid trivial, overly simple, or elementary-level questions
- Include questions that require multi-step reasoning, critical thinking, and problem-solving
- Questions must match the complexity and rigor of actual competitive entrance exam questions

QUESTION QUALITY REQUIREMENTS:
1. Question text must be clear, concise, and grammatically correct
2. All 4 options must be plausible and well-constructed
3. Wrong options (distractors) should be common mistakes or misconceptions
4. Options should be similar in length and format when possible
5. Avoid using "All of the above" or "None of the above" unless contextually appropriate
6. For numerical questions, ensure options are in logical order (ascending/descending)
7. Questions should be solvable within 1-3 minutes for an average student
8. Include variety: conceptual questions, calculation-based, application-based, and analysis-based

CRITICAL REQUIREMENTS:
1. Generate the same number of questions as in the provided PDF
2. Return ONLY a valid JSON array - no markdown, no explanations, no extra text
3. Start your response with [ and end with ]
4. Each question must have exactly these fields:
   - "questionsText": The question text (string) - must be clear and complete
   - "Options": An array of exactly 4 strings - all must be plausible answers
   - "correctOption": The correct answer as a string (must match one of the Options exactly)

JSON FORMATTING RULES:
- All strings must be properly escaped for JSON
- If using mathematical notation or LaTeX, escape backslashes properly: use \\\\ for a single backslash
- Example: "f(x) = x^2" is fine, but "f(x) = \\frac{1}{2}" needs double backslashes: "f(x) = \\\\frac{1}{2}"
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
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: `${prompt}\n\nCONTENT:\n${source}` },
          ],
        },
      ],
      temperature: 0.7,
    });

    if (response) {
      console.log("Tokens used:", response?.usage?.total_tokens);
    }

    const rawOutput = response.output_text || "[]";

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

  // Batch processing for large question counts
  if (finalNumQuestions <= BATCH_SIZE) {
    // Small enough for single batch
    const questions = await generateBatch(
      source,
      finalNumQuestions,
      subjectId,
      undefined,
      undefined,
      0,
      isUsingSummary
    );

    // Add embeddings and topics
    const questionsWithEmbeddings = await Promise.all(
      questions.map(async (q: any) => ({
        ...q,
        embedding: await generateEmbedding(
          `${q.questionsText} ${q.Options.join(" ")}`
        ),
        topics: extractTopics(q),
      }))
    );

    // Filter duplicates if subjectId is provided
    if (subjectId) {
      return await filterDuplicates(questionsWithEmbeddings, subjectId);
    }

    return questionsWithEmbeddings;
  }

  // Calculate batches with dynamic batch size
  let currentBatchSize = BATCH_SIZE;
  const allQuestions: any[] = [];
  let batchNumber = 1;
  let consecutiveFailures = 0;

  console.log(
    `Generating ${finalNumQuestions} questions in batches (starting with ${currentBatchSize} questions per batch)`
  );

  // Process batches sequentially to avoid rate limits
  while (allQuestions.length < finalNumQuestions) {
    const remainingQuestions = finalNumQuestions - allQuestions.length;
    const actualBatchSize = Math.min(currentBatchSize, remainingQuestions);

    // If we need very few questions, just generate them
    if (remainingQuestions <= 5) {
      console.log(
        `Final batch: generating remaining ${remainingQuestions} questions...`
      );
      let batchQuestions = await generateBatch(
        source,
        remainingQuestions,
        subjectId,
        batchNumber,
        undefined,
        0,
        isUsingSummary
      );

      if (batchQuestions && batchQuestions.length > 0) {
        // Add embeddings and topics
        const questionsWithEmbeddings = await Promise.all(
          batchQuestions.map(async (q: any) => ({
            ...q,
            embedding: await generateEmbedding(
              `${q.questionsText} ${q.Options.join(" ")}`
            ),
            topics: extractTopics(q),
          }))
        );

        // Filter duplicates if subjectId is provided
        if (subjectId) {
          batchQuestions = await filterDuplicates(
            questionsWithEmbeddings,
            subjectId
          );
        } else {
          batchQuestions = questionsWithEmbeddings;
        }

        if (batchQuestions.length > 0) {
          allQuestions.push(...batchQuestions);
          console.log(
            `Final batch completed: ${batchQuestions.length} unique questions generated (Total: ${allQuestions.length}/${finalNumQuestions})`
          );
        }
      }
      break;
    }

    const estimatedBatches = Math.ceil(remainingQuestions / currentBatchSize);
    console.log(
      `Batch ${batchNumber}/${estimatedBatches}: Generating ${actualBatchSize} questions...`
    );

    let batchQuestions = await generateBatch(
      source,
      actualBatchSize,
      subjectId,
      batchNumber,
      estimatedBatches,
      0,
      isUsingSummary
    );

    if (batchQuestions && batchQuestions.length > 0) {
      // Add embeddings and topics
      const questionsWithEmbeddings = await Promise.all(
        batchQuestions.map(async (q: any) => ({
          ...q,
          embedding: await generateEmbedding(
            `${q.questionsText} ${q.Options.join(" ")}`
          ),
          topics: extractTopics(q),
        }))
      );

      // Filter duplicates if subjectId is provided
      if (subjectId) {
        batchQuestions = await filterDuplicates(
          questionsWithEmbeddings,
          subjectId
        );
      } else {
        batchQuestions = questionsWithEmbeddings;
      }

      if (batchQuestions.length > 0) {
        allQuestions.push(...batchQuestions);
        consecutiveFailures = 0; // Reset failure counter on success
        console.log(
          `Batch ${batchNumber} completed: ${batchQuestions.length} questions added (Total: ${allQuestions.length}/${finalNumQuestions})`
        );
      } else {
        console.warn(
          `Batch ${batchNumber} had no unique questions after deduplication`
        );
        consecutiveFailures++;
      }
    } else {
      consecutiveFailures++;
      console.warn(
        `Batch ${batchNumber} returned no questions (consecutive failures: ${consecutiveFailures})`
      );

      // If we have multiple consecutive failures, reduce batch size
      if (consecutiveFailures >= 2 && currentBatchSize > 5) {
        currentBatchSize = Math.max(5, Math.floor(currentBatchSize / 2));
        console.log(
          `Reducing batch size to ${currentBatchSize} due to consecutive failures`
        );
        consecutiveFailures = 0; // Reset after adjusting
      }

      // If we've failed too many times, stop to avoid infinite loop
      if (consecutiveFailures >= 5) {
        console.error(
          `Too many consecutive failures. Stopping generation. Generated ${allQuestions.length} out of ${finalNumQuestions} questions.`
        );
        break;
      }
    }

    batchNumber++;

    // Delay between batches to avoid rate limiting
    if (allQuestions.length < finalNumQuestions) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(
    `Question generation complete: ${allQuestions.length} questions generated (requested: ${finalNumQuestions})`
  );

  return allQuestions;
};
