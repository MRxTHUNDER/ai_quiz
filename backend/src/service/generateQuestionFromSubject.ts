import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH_SIZE = 10;
const BATCH_DELAY = 2000; // 2 seconds

const fixJsonEscaping = (jsonString: string): string => {
  let fixed = jsonString;

  fixed = fixed.replace(/\\\(/g, "\\\\(");
  fixed = fixed.replace(/\\\)/g, "\\\\)");

  fixed = fixed.replace(/\\(\[|\])/g, "\\\\$1");

  fixed = fixed.replace(/\\([{}])/g, "\\\\$1");

  return fixed;
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

const parseJsonSafely = (jsonString: string): any => {
  try {
    return JSON.parse(jsonString);
  } catch (error: any) {
    try {
      const fixed = fixJsonEscaping(jsonString);
      return JSON.parse(fixed);
    } catch (secondError) {
      try {
        let aggressiveFix = jsonString;

        aggressiveFix = aggressiveFix.replace(/\\\(/g, "\\\\(");
        aggressiveFix = aggressiveFix.replace(/\\\)/g, "\\\\)");
        aggressiveFix = aggressiveFix.replace(/\\\[/g, "\\\\[");
        aggressiveFix = aggressiveFix.replace(/\\\]/g, "\\\\]");
        aggressiveFix = aggressiveFix.replace(/\\\{/g, "\\\\{");
        aggressiveFix = aggressiveFix.replace(/\\\}/g, "\\\\}");
        aggressiveFix = aggressiveFix.replace(/\\(?![\\"/bfnrtu])/g, "\\\\");

        return JSON.parse(aggressiveFix);
      } catch (thirdError) {
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
        throw error;
      }
    }
  }
};

const generateBatchFromSubject = async (
  subjectName: string,
  entranceExamName: string,
  numQuestions: number,
  topic?: string,
  batchNumber?: number
): Promise<any[]> => {
  let content = "[]";
  try {
    const topicText = topic
      ? `\nFOCUS TOPIC: ${topic}\nGenerate all questions specifically about: ${topic}`
      : "";

    const prompt = `
You are an expert question generator specializing in ${entranceExamName} entrance exam preparation. Your task is to create high-quality, competitive-level questions that accurately reflect the standards, difficulty, and question patterns of ${entranceExamName}.

Generate ${numQuestions} multiple-choice questions for the subject: ${subjectName}${topicText}

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

REQUIREMENTS:
1. Generate EXACTLY ${numQuestions} high-quality questions
2. Questions must match ${entranceExamName} exam pattern, difficulty level, and question style
3. Cover diverse ${
      topic ? "aspects and applications of " + topic : "important topics and concepts within " + subjectName
    }
4. Each question must have exactly 4 options
5. Return ONLY valid JSON array - no markdown, no explanations, no additional text

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
- All strings must be properly JSON-escaped
- For LaTeX/math notation, use double backslashes: \\\\
- Ensure questions are suitable for competitive entrance exam preparation

Return ONLY the JSON array. No markdown code blocks, no explanations, no additional commentary.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
      temperature: 0.8, // Higher temperature for more variety
    });

    content = response.output_text || "[]";

    // Clean and parse with robust error handling
    const cleanedContent = cleanJsonOutput(content);
    const questions = parseJsonSafely(cleanedContent);

    console.log(
      `Batch ${batchNumber || 1}: Generated ${
        questions.length
      } questions from subject knowledge (${subjectName})`
    );

    return Array.isArray(questions) ? questions : [];
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
  topic?: string
): Promise<any[]> => {
  // If requesting 10 or fewer questions, do single batch
  if (numQuestions <= BATCH_SIZE) {
    return await generateBatchFromSubject(
      subjectName,
      entranceExamName,
      numQuestions,
      topic,
      1
    );
  }

  // Generate in batches for larger requests
  const allQuestions: any[] = [];
  const totalBatches = Math.ceil(numQuestions / BATCH_SIZE);

  console.log(
    `Generating ${numQuestions} questions in ${totalBatches} batches of ${BATCH_SIZE} (${subjectName} - ${entranceExamName})`
  );

  for (let i = 0; i < totalBatches; i++) {
    const remainingQuestions = numQuestions - allQuestions.length;
    const batchSize = Math.min(BATCH_SIZE, remainingQuestions);
    const batchNumber = i + 1;

    const batchQuestions = await generateBatchFromSubject(
      subjectName,
      entranceExamName,
      batchSize,
      topic,
      batchNumber
    );

    if (batchQuestions && batchQuestions.length > 0) {
      allQuestions.push(...batchQuestions);
      console.log(
        `Progress: ${allQuestions.length}/${numQuestions} questions generated`
      );
    }

    // Delay between batches (except for last batch)
    if (batchNumber < totalBatches) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  console.log(
    `Completed: ${allQuestions.length} total questions generated (${subjectName} - ${entranceExamName})`
  );

  return allQuestions;
};
