import OpenAI from "openai";
import dotenv from "dotenv";
import { Summary } from "../models/summary.model";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const extractTopicsAndSummaryFromPDF = async (
  fileUrl: string
): Promise<{ topics: string[]; summaryText: string; keywords: string[] }> => {
  try {
    const prompt = `
You are an educational content analyzer. Analyze this PDF document and provide:

1. Main topics/chapters covered (3-10 topics)
2. A comprehensive summary covering all key concepts, formulas, definitions, and important points
3. Key keywords/terms (5-10 keywords)

INSTRUCTIONS:
- Topics should be specific but concise (e.g., "Differential Calculus", "Newton's Laws of Motion")
- Summary should be detailed enough to generate diverse exam questions from
- Include specific facts, numbers, dates, formulas that might appear in exam questions
- Organize summary by topic/chapter for clarity
- Include important examples or problem-solving approaches

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "topics": ["topic1", "topic2", "topic3"],
  "summaryText": "Your comprehensive summary here...",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

No markdown code blocks, no explanations, just the JSON object.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_file",
              file_url: fileUrl,
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = response.output_text || "{}";
    const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const result = JSON.parse(cleanedContent);

    console.log(
      `Extracted ${result.topics?.length || 0} topics and generated summary (${
        result.keywords?.length || 0
      } keywords)`
    );

    return {
      topics: Array.isArray(result.topics) ? result.topics : [],
      summaryText: result.summaryText || "",
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
    };
  } catch (error) {
    console.error("Error extracting topics and summary from PDF:", error);
    throw error;
  }
};

const calculateTopicSimilarity = (
  topics1: string[],
  topics2: string[]
): number => {
  const set1 = new Set(topics1.map((t) => t.toLowerCase().trim()));
  const set2 = new Set(topics2.map((t) => t.toLowerCase().trim()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;
  return intersection.size / union.size;
};

export const findSimilarSummary = async (
  subjectId: string,
  entranceExamId: string,
  topics: string[],
  similarityThreshold: number = 0.6
): Promise<any | null> => {
  try {
    // Get all summaries for this subject and exam
    const existingSummaries = await Summary.find({
      subject: subjectId,
      entranceExam: entranceExamId,
    });

    if (existingSummaries.length === 0) {
      return null;
    }

    // Find most similar summary
    let mostSimilar: any = null;
    let highestSimilarity = 0;

    for (const summary of existingSummaries) {
      const similarity = calculateTopicSimilarity(topics, summary.topics);

      if (similarity > highestSimilarity && similarity >= similarityThreshold) {
        highestSimilarity = similarity;
        mostSimilar = summary;
      }
    }

    if (mostSimilar) {
      console.log(
        `Found similar summary with ${(highestSimilarity * 100).toFixed(
          1
        )}% topic overlap`
      );
    }

    return mostSimilar;
  } catch (error) {
    console.error("Error finding similar summary:", error);
    return null;
  }
};

export const generateSummaryFromPDF = async (
  fileUrl: string,
  topics: string[]
): Promise<{ summaryText: string; keywords: string[] }> => {
  try {
    const topicsText = topics.join(", ");
    const prompt = `
You are an educational content analyzer. Create a comprehensive summary of this document that will be used to generate exam questions.

TOPICS COVERED: ${topicsText}

INSTRUCTIONS:
1. Create a detailed summary covering all key concepts, formulas, definitions, and important points
2. Include specific facts, numbers, dates, formulas that might appear in exam questions
3. Organize by topic/chapter for clarity
4. Include important examples or problem-solving approaches
5. The summary should be comprehensive enough to generate diverse questions from
6. Extract 5-10 key keywords/terms from the content

IMPORTANT: Return ONLY valid JSON in this exact format:
{
  "summaryText": "Your comprehensive summary here...",
  "keywords": ["keyword1", "keyword2", ...]
}

No markdown code blocks, no explanations, just the JSON object.
`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_file",
              file_url: fileUrl,
            },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = response.output_text || "{}";
    const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const result = JSON.parse(cleanedContent);

    console.log(
      `Generated summary: ${result.summaryText.substring(0, 100)}... (${
        result.keywords.length
      } keywords)`
    );

    return {
      summaryText: result.summaryText || "",
      keywords: result.keywords || [],
    };
  } catch (error) {
    console.error("Error generating summary from PDF:", error);
    throw error;
  }
};

/**
 * Get or create summary for a PDF
 * Checks for existing similar summaries first, creates new one if needed
 */
export const getOrCreateSummary = async (
  pdfId: string,
  fileUrl: string,
  subjectId: string,
  entranceExamId: string
): Promise<any> => {
  try {
    console.log("Extracting topics and generating summary from PDF...");
    const { topics, summaryText, keywords } =
      await extractTopicsAndSummaryFromPDF(fileUrl);

    if (topics.length === 0) {
      throw new Error("Failed to extract topics from PDF");
    }

    console.log("Checking for existing similar summary...");
    const existingSummary = await findSimilarSummary(
      subjectId,
      entranceExamId,
      topics
    );

    if (existingSummary) {
      console.log("Reusing existing summary (topic match found)");

      // Add this PDF to the sourcePdfs array if not already there
      if (!existingSummary.sourcePdfs.includes(pdfId)) {
        existingSummary.sourcePdfs.push(pdfId);
        await existingSummary.save();
      }

      return existingSummary;
    }

    console.log("No similar summary found, creating new summary...");

    const newSummary = await Summary.create({
      summaryText,
      topics,
      keywords,
      subject: subjectId,
      entranceExam: entranceExamId,
      sourcePdfs: [pdfId],
    });

    console.log("New summary created and stored");
    return newSummary;
  } catch (error) {
    console.error("Error in getOrCreateSummary:", error);
    throw error;
  }
};
