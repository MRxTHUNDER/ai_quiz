import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const GenerateAIQuestions = async (fileUrl: string) => {
  const numQuestionsEnv = process.env.NUM_QUESTIONS;
  const numQuestions = Number(numQuestionsEnv);

  let prompt: string;

  if (numQuestions && numQuestions > 0) {
    prompt = `
Analyze this previous year question paper and generate new questions in the exact same format and difficulty.
Generate exactly ${numQuestions} questions.
Return only the following fields for each question in JSON format:
{
  "questionsText": "<question_text>",
  "Options": ["option1", "option2", "option3", "option4"],
  "correctOption": "<the_correct_option>"
}
Do not include any extra text, explanation, or metadata.
`;
  } else {
    prompt = `
Analyze this previous year question paper and generate new questions in the exact same format and difficulty.
Generate the same number of questions as in the provided PDF.
Return only the following fields for each question in JSON format:
{
  "questionsText": "<question_text>",
  "Options": ["option1", "option2", "option3", "option4"],
  "correctOption": "<the_correct_option>"
}
Do not include any extra text, explanation, or metadata.
`;
  }

  const response = await client.responses.create({
    model: "gpt-4",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_file", file_url: fileUrl },
        ],
      },
    ],
  });

  const rawOutput = response.output_text;

  try {
    const questions = JSON.parse(rawOutput);
    return questions;
  } catch (error) {
    console.error("Failed to parse AI output:", error);
    console.log("Raw output:", rawOutput);
    return [];
  }
};
