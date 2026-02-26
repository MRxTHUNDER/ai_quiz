import { BATCH_SIZE, client, MAX_RETRIES, OPENAI_MODEL_MINI } from "../env";

const BATCH_SIZE_QUESTIONS = 50; // Questions per batch
const MAX_BATCHES = 10; // Maximum number of parallel batches per wave
const BATCH_DELAY = 5000; // 5 seconds between waves

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
    "$1\"$2$3",
  );

  normalized = normalized.replace(
    /([\[,\s])(\+?\-?\d+(?:\.\d+)?)(\s*[\],])/g,
    "$1\"$2\"$3",
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
  "π": "pi",
  "α": "alpha",
  "β": "beta",
  "γ": "gamma",
  "δ": "delta",
  "θ": "theta",
  "λ": "lambda",
  "μ": "mu",
  "σ": "sigma",
  "ω": "omega",
};

const normalizeStemText = (str: string): string => {
  return str
    .replace(/\\[a-zA-Z]+?\([^)]*?\)/g, (match) =>
      match.replace(/\\./g, "_"),
    )
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉½¼¾]/g, (char) =>
      superscriptSubscriptMap[char] || char,
    )
    .replace(/[→←↔↑↓∫∂√∑∞±≈≠≤≥⋅παβγδθλμσω]/g, (char) =>
      symbolMap[char] || char,
    );
};

const parseJsonSafely = (jsonString: string): any => {
  const normalized = normalizeStemText(jsonString)
    .replace(/\\(?![\\"/bfnrtu])/g, "\\\\")
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*?)\s*:/g, '$1"$2":')
    .replace(/,\s*([\]}])/g, "$1")
    .trim();

  try {
    return JSON.parse(normalized);
  } catch (error: any) {
    const arrayMatch = normalized.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
      }
    }

    const objectLines = normalized
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("{") && line.endsWith("}"));

    const validObjects = objectLines
      .map((line) => {
        try {
          return JSON.parse(line);
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
        const pos = parseInt(match[1]);
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
You are an expert question generator specializing in ${entranceExamName} entrance exam preparation. Your task is to create high-quality, competitive-level questions that accurately reflect the standards, difficulty, and question patterns of ${entranceExamName}.

Generate ${numQuestions} multiple-choice questions for the subject: ${subjectName}${topicText}

LANGUAGE REQUIREMENT (CRITICAL - MUST FOLLOW STRICTLY):
- By default, ALL questions, options, and answers MUST be written entirely in ENGLISH.
- CRITICAL EXCEPTION: If the subject name "${subjectName}" is a LANGUAGE subject (any language - regional, foreign, or classical), you MUST write the ENTIRE question, ALL options, and ALL text IN THAT LANGUAGE.
- This means: If the subject is Hindi, write in Hindi (हिंदी में लिखें). If it's Urdu, write in Urdu (اردو میں لکھیں). If it's French, write in French. And so on for ANY language.
- DO NOT write questions ABOUT the language in English - write questions IN that language with native script/alphabet.
- For language subjects: questionsText must be in that language, all Options must be in that language, everything in that language's native script.
- For non-language subjects (like Science, Math, History, etc.): Always use English.
- DO NOT mix languages within a single question.

ENTRANCE EXAM QUESTION STANDARDS FOR ${entranceExamName}:
- Questions must test DEEP CONCEPTUAL UNDERSTANDING, not just rote memorization
- Include questions that require APPLICATION of concepts to solve real-world or theoretical problems
- Mix of difficulty levels: 30% easy (basic concepts), 50% medium (application), 20% challenging (advanced analysis)
- Questions should be CLEAR, UNAMBIGUOUS, and professionally worded
- Each question should test a specific concept, principle, or skill relevant to ${entranceExamName}
- Avoid trivial, overly simple, or trick questions
- Include questions that require multi-step reasoning, critical thinking, and problem-solving
- Questions should match the complexity and style of actual ${entranceExamName} exam questions
- Ensure questions are aligned with the ${entranceExamName} syllabus and exam pattern

UNIQUENESS AND VARIETY REQUIREMENTS (CRITICAL):
- Generate UNIQUE and DIFFERENT questions - avoid repetitive patterns or similar concepts
- Ensure MAXIMUM VARIETY in topics, question types, and approaches within this batch
- Do NOT repeat similar question structures, calculations, or concepts
- Cover DIFFERENT aspects and subtopics of the subject matter
- Avoid generating questions that test the same knowledge point multiple times
- Each question should be DISTINCTLY different in its focus and approach
- Vary question formats: conceptual, analytical, calculation-based, application-based, etc.
- If generating multiple questions, ensure they complement each other rather than overlap

QUESTION QUALITY REQUIREMENTS:
1. Question text must be clear, concise, grammatically correct, and professionally written
2. All 4 options must be plausible, well-constructed, and test understanding
3. Wrong options (distractors) should represent common mistakes, misconceptions, or partial understanding
4. Options should be similar in length and format when possible (avoid obvious giveaways)
5. Avoid using "All of the above" or "None of the above" unless contextually appropriate for ${entranceExamName}
6. For numerical questions, ensure options are in logical order (ascending/descending) and include reasonable values
7. Questions should be solvable within 1-3 minutes for a well-prepared ${entranceExamName} candidate
8. Include variety: conceptual understanding, calculation-based, application-based, analysis-based, and synthesis questions
9. Questions should test both breadth and depth of knowledge in ${subjectName}
10. Ensure questions are factually accurate and align with current ${entranceExamName} curriculum standards

CORRECT ANSWER VALIDATION (MANDATORY - VERIFY BEFORE MARKING AS CORRECT):
- BEFORE marking any option as "correctOption", you MUST verify it is factually, mathematically, and logically CORRECT
- For calculation-based questions: Work through the problem step-by-step, verify all calculations, and confirm the answer is accurate
- For conceptual questions: Verify the answer aligns with established facts, principles, and current knowledge in the field
- For application questions: Ensure the answer correctly applies the concept to the given scenario
- Double-check: The correctOption MUST be the ONLY definitively correct answer among the 4 options
- Verify: The correctOption string must EXACTLY match one of the Options (character-by-character, including spaces and punctuation)
- If you are uncertain about correctness, DO NOT mark it as correct - generate a different question instead
- This is CRITICAL: Incorrect answers marked as correct will mislead students and damage the quality of the exam

REQUIREMENTS:
1. Generate EXACTLY ${numQuestions} high-quality questions
2. Questions must match ${entranceExamName} exam pattern, difficulty level, and question style
3. Cover diverse ${
      topic
        ? "aspects and applications of " + topic
        : "important topics and concepts within " + subjectName
    }
4. Each question must have exactly 4 options
5. Return ONLY valid JSON array - no markdown, no explanations, no additional text
6. VERIFICATION STEP: Before finalizing each question, verify the correctOption is actually correct by:
   - Solving/answering the question yourself
   - Checking calculations if numerical
   - Verifying facts if conceptual
   - Ensuring the answer is unambiguous and definitively correct

JSON FORMAT:
[
  {
    "questionsText": "The question text here (clear, complete, and professionally worded)",
    "Options": ["Option A (plausible distractor)", "Option B (correct answer)", "Option C (plausible distractor)", "Option D (plausible distractor)"],
    "correctOption": "Option B (must match one of the Options exactly)"
  }
]

IMPORTANT:
- Questions should be factual, accurate, and aligned with ${entranceExamName} standards
- Difficulty level must match ${entranceExamName} exam expectations
- Cover various important concepts, principles, and applications in ${subjectName}
- CRITICAL JSON ESCAPING: All strings must be properly JSON-escaped. 
- CRITICAL MATH ESCAPING: For LaTeX or math notation, NEVER use a single backslash like "\\( " or "\\[". You MUST use DOUBLE backslashes: "\\\\" (e.g., "\\\\( x^2 \\\\)" or "\\\\[ \\\\frac{1}{2} \\\\]"). Single backslashes will cause the JSON parser to crash immediately.
- Ensure questions are suitable for competitive entrance exam preparation
- FINAL CHECK: Before returning the JSON, verify EVERY correctOption is factually correct - do not guess or assume
 - OUTPUT ONLY VALID JSON. Escape all backslashes (\\\\), quotes (\\"), and newlines (\\n).
 - Use simple plain text only: NO LaTeX, NO unicode subscripts/superscripts/symbols.
 - Example: use "sulfate ion SO4 2-" instead of formatted chemistry symbols.
 - NEVER add markdown, explanations, or code blocks.

Return ONLY the JSON array. No markdown code blocks, no explanations, no additional commentary.
`;
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
        max_output_tokens: 6000,
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

      const cleanedContent = extractJsonArrayCandidate(cleanJsonOutput(content));

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
    
    console.log(`\n🌊 Wave ${wave + 1}/${totalWaves}: Running batches ${startBatch + 1}-${endBatch} in parallel...`);
    
    const batchPromises: Promise<{batchNumber: number, questions: any[]}>[] = [];
    
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
        
        allQuestions.push(...questions);
        console.log(
          `Batch ${batchNumber} completed: ${questions.length} questions added (Total: ${allQuestions.length}/${numQuestions})`,
        );
      } else if (result.status === 'rejected') {
        console.error('Batch promise was rejected:', result.reason);
      } else if (result.status === 'fulfilled' && result.value.questions.length === 0) {
        console.warn(`Batch ${result.value.batchNumber} returned no questions`);
      }
    }
    
    console.log(`✅ Wave ${wave + 1} complete: ${allQuestions.length}/${numQuestions} questions generated so far`);

    if (wave < totalWaves - 1) {
      console.log(`⏳ Waiting ${BATCH_DELAY / 1000}s before next wave...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(
    `Completed: ${allQuestions.length} total questions generated (${subjectName} - ${entranceExamName})`,
  );

  return allQuestions;
};
