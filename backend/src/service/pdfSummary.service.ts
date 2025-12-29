import OpenAI from "openai";
import dotenv from "dotenv";
import { Summary } from "../models/summary.model";

dotenv.config();

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extract topics from PDF (lightweight operation)
 * Returns array of topic strings
 */
export const extractTopicsFromPDF = async (
  fileUrl: string
): Promise<string[]> => {
  try {
    const prompt = `
Analyze this PDF and extract the main topics/chapters covered.

INSTRUCTIONS:
1. List 3-10 main topics or chapters covered in this document
2. Be specific but concise (e.g., "Differential Calculus", "Newton's Laws of Motion", "Organic Chemistry - Aldehydes")
3. Return ONLY a JSON array of topic strings
4. No markdown, no explanations, just the JSON array

EXAMPLE OUTPUT:
["Differential Calculus", "Integration Techniques", "Applications of Derivatives"]

Return ONLY the JSON array.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: fileUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const cleanedContent = content.trim().replace(/```json\n?|\n?```/g, "");
    const topics = JSON.parse(cleanedContent);

    console.log(`Extracted ${topics.length} topics:`, topics);
    return Array.isArray(topics) ? topics : [];
  } catch (error) {
    console.error("Error extracting topics from PDF:", error);
    return [];
  }
};

/**
 * Calculate Jaccard similarity between two arrays of strings
 * Returns value between 0 and 1 (1 = identical, 0 = no overlap)
 */
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

/**
 * Find existing summary with similar topics for the same subject
 * Returns summary if similarity >= threshold (default 0.6)
 */
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

/**
 * Generate comprehensive summary from PDF with topics
 */
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

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: { url: fileUrl },
            },
          ],
        },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "{}";
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
    console.log("Extracting topics from PDF...");
    const topics = await extractTopicsFromPDF(fileUrl);

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

    console.log("No similar summary found, generating new summary...");
    const { summaryText, keywords } = await generateSummaryFromPDF(
      fileUrl,
      topics
    );

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
