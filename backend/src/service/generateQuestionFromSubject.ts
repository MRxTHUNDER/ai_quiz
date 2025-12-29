import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Generate questions based on subject name and entrance exam (no PDF/summary required)
 * This is a fallback method when summary generation fails
 */
export const GenerateQuestionsFromSubjectKnowledge = async (
  subjectName: string,
  entranceExamName: string,
  numQuestions: number = 10
): Promise<any[]> => {
  try {
    const prompt = `
You are an expert question generator for ${entranceExamName} entrance exam preparation.

Generate ${numQuestions} multiple-choice questions for the subject: ${subjectName}

REQUIREMENTS:
1. Generate EXACTLY ${numQuestions} high-quality questions
2. Questions should match ${entranceExamName} exam pattern and difficulty level
3. Cover diverse topics within ${subjectName}
4. Each question must have exactly 4 options
5. Return ONLY valid JSON array - no markdown, no explanations

JSON FORMAT:
[
  {
    "questionsText": "The question text here",
    "Options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOption": "The correct option (must match one of the Options exactly)"
  }
]

IMPORTANT:
- Questions should be factual and accurate
- Difficulty level: ${entranceExamName} standard
- Cover various concepts in ${subjectName}
- All strings must be properly JSON-escaped
- For LaTeX/math notation, use double backslashes: \\\\

Return ONLY the JSON array. No markdown code blocks, no explanations.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.8, // Higher temperature for more variety
    });

    const content = response.choices[0]?.message?.content || "[]";

    // Clean and parse
    const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const questions = JSON.parse(cleanedContent);

    console.log(
      `Generated ${questions.length} questions from subject knowledge (${subjectName} - ${entranceExamName})`
    );

    return Array.isArray(questions) ? questions : [];
  } catch (error) {
    console.error("Error generating questions from subject knowledge:", error);
    return [];
  }
};
