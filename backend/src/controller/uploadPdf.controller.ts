import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { Pdf } from "../models/pdf.model";
import { getPresignUploadUrl } from "../service/s3Service";
import { GenerateAIQuestions } from "../service/generateQuestion";
import { QuestionModel } from "../models/questions.model";
import { getOrCreateSummary } from "../service/pdfSummary.service";
import { GenerateQuestionsFromSubjectKnowledge } from "../service/generateQuestionFromSubject";

export const UploadSubjectPDF = async (req: Request, res: Response) => {
  try {
    const { contentType, fileName } = req.body;

    if (!contentType || !fileName) {
      res.status(400).json({
        message: "contentType and fileName required",
      });
      return;
    }

    const { key, url } = await getPresignUploadUrl(fileName, contentType);

    res.status(200).json({
      status: "Success",
      message: "Use this url to upload your pdf",
      url,
      key,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error generating upload url",
      error,
    });
  }
};

export const UploadBannerImage = async (req: Request, res: Response) => {
  try {
    const { contentType, fileName } = req.body;

    if (!contentType || !fileName) {
      res.status(400).json({
        message: "contentType and fileName required",
      });
      return;
    }

    const { key, url } = await getPresignUploadUrl(
      fileName,
      contentType,
      "images/banners",
    );

    const r2WorkerUrl = process.env.R2_WORKER_URL || "";
    const finalFileUrl = r2WorkerUrl
      ? `${r2WorkerUrl}${r2WorkerUrl.endsWith("/") ? "" : "/"}${key}`
      : key;

    res.status(200).json({
      status: "Success",
      message: "Use this url to upload your banner image",
      url,
      key,
      fileUrl: finalFileUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error generating upload url",
      error,
    });
  }
};

export const TagPDF = async (req: Request, res: Response) => {
  try {
    const { fileName, key, subjectId, entranceExamId, numQuestions } = req.body;
    const userId = req.userId;

    // Set default numQuestions to random value between 50-60 if not provided
    const finalNumQuestions =
      numQuestions || 50 + Math.floor(Math.random() * 11);

    if (!fileName || !key || !subjectId || !entranceExamId) {
      res.status(400).json({
        message: "fileName, key, subjectId, and entranceExamId are required",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    // Find or create subject by name (subjectId is actually the subject name)
    let subject = await Subject.findOne({
      subjectName: subjectId,
    });

    if (!subject) {
      // Create subject if it doesn't exist
      subject = await Subject.create({
        subjectName: subjectId,
        testDuration: 60, // Default duration
      });
    }

    // Find entrance exam by ID (entranceExamId is the exam ID like "CUET", "JEE", etc.)
    let entranceExam = await EntranceExam.findOne({
      $or: [
        { entranceExamId: entranceExamId },
        { entranceExamName: entranceExamId },
      ],
    });

    // If not found, try to find by name or create a basic exam
    if (!entranceExam) {
      // Map exam IDs to full names for backward compatibility
      const examNameMap: Record<string, string> = {
        CUET: "CUET",
        CET: "CET",
        JEE: "JEE Main",
        NEET: "NEET",
        CLAT: "CLAT",
        CAT: "CAT",
      };
      const examName = examNameMap[entranceExamId] || entranceExamId;

      entranceExam = await EntranceExam.create({
        entranceExamName: examName,
        entranceExamId: entranceExamId,
        durationMinutes: 180, // Default duration
        subjects: [],
      });
    }

    // Ensure subject is added to entrance exam's subjects array if not already present
    // Check if subject already exists in the exam's subjects array
    const subjectExists = entranceExam.subjects.some(
      (sub: any) => sub.subject.toString() === subject._id.toString(),
    );

    if (!subjectExists) {
      // Get duration from subject or use default
      const durationMinutes = subject.testDuration || 60;
      entranceExam.subjects.push({
        subject: subject._id,
        durationMinutes: durationMinutes,
      });
      await entranceExam.save();
    }

    const r2WorkerUrl = process.env.R2_WORKER_URL || "";
    // Ensure proper URL concatenation - add / if base URL doesn't end with it
    // Key format is always "uploads/pdf/..." (no leading slash)
    const finalFileUrl = r2WorkerUrl
      ? `${r2WorkerUrl}${r2WorkerUrl.endsWith("/") ? "" : "/"}${key}`
      : key;

    const pdf = await Pdf.create({
      fileName,
      fileUrl: finalFileUrl,
      key,
      subject: subject._id,
      entranceExam: entranceExam._id,
      uploadedBy: userId,
    });

    // Update subject key if not already set
    if (!subject.key) {
      subject.key = key;
      await subject.save();
    }

    // Get or create summary for this PDF (with topic matching)
    let summary = null;
    try {
      console.log("Processing PDF summary...");
      summary = await getOrCreateSummary(
        pdf._id.toString(),
        finalFileUrl,
        subject._id.toString(),
        entranceExam._id.toString(),
      );
      console.log("Summary processed successfully");
    } catch (summaryError: any) {
      // Log the FULL error details
      console.error("=== ERROR PROCESSING SUMMARY (FULL) ===");
      console.error("Error:", summaryError);
      console.error("Error message:", summaryError?.message);
      console.error("Error stack:", summaryError?.stack);
      if (summaryError?.response) {
        console.error(
          "Error response:",
          JSON.stringify(summaryError.response, null, 2),
        );
      }
      console.error("======================================");
      // Don't fail the request if summary generation fails
    }

    // Generate questions (using default 50-60 if not provided)
    let generatedQuestions = null;
    if (finalNumQuestions && finalNumQuestions > 0) {
      try {
        console.log(
          `Generating ${finalNumQuestions} questions for subject ${subject.subjectName}`,
        );

        let questions = null;

        // Try summary-based generation first if summary exists
        if (summary?.summaryText) {
          try {
            console.log("Attempting question generation from summary...");
            questions = await GenerateAIQuestions(
              summary.summaryText,
              finalNumQuestions,
              subject._id.toString(),
              true,
            );
            console.log(
              `Successfully generated ${
                questions?.length || 0
              } questions from summary`,
            );
          } catch (summaryGenError) {
            console.error("Summary-based generation failed:", summaryGenError);
            questions = null;
          }
        }

        // Fallback: Generate questions based on subject knowledge (no PDF/summary needed)
        if (!questions || questions.length === 0) {
          console.log(
            `Generating questions from subject knowledge: ${subject.subjectName} (${entranceExam.entranceExamName})...`,
          );
          questions = await GenerateQuestionsFromSubjectKnowledge(
            subject.subjectName,
            entranceExam.entranceExamName,
            finalNumQuestions,
          );
          console.log(
            `Generated ${
              questions?.length || 0
            } questions from subject knowledge`,
          );
        }

        if (questions && Array.isArray(questions) && questions.length > 0) {
          // Format questions for database
          const formattedQuestions = questions.map((q: any) => ({
            questionsText: q.questionsText,
            Options: q.Options,
            correctOption: q.correctOption,
            SubjectId: subject._id,
            entranceExam: entranceExam._id,
            createdBy: userId || undefined,
          }));

          // Save questions to database
          generatedQuestions =
            await QuestionModel.insertMany(formattedQuestions);
          console.log(
            `Successfully generated and saved ${generatedQuestions.length} questions`,
          );
        } else {
          console.warn("No questions generated from AI service");
        }
      } catch (questionError) {
        console.error("Error generating questions:", questionError);
        // Don't fail the entire request if question generation fails
        // Just log the error and continue
      }
    }

    res.status(201).json({
      status: "Success",
      message: "PDF tagged and registered successfully",
      pdf,
      summary: summary
        ? {
            id: summary._id,
            topics: summary.topics,
            reused: summary.sourcePdfs.length > 1,
          }
        : undefined,
      questionsGenerated: generatedQuestions?.length || 0,
      questions: generatedQuestions || undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error tagging PDF",
      error,
    });
  }
};

/**
 * Generate questions directly without PDF
 * POST /upload/generate-direct
 */
export const GenerateQuestionsDirect = async (req: Request, res: Response) => {
  try {
    const { entranceExamId, subjectId, topic, numQuestions } = req.body;
    const userId = req.userId;

    if (!entranceExamId || !subjectId) {
      res.status(400).json({
        message: "entranceExamId and subjectId are required",
      });
      return;
    }

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    const finalNumQuestions = numQuestions || 50;

    // Find or create subject by name
    let subject = await Subject.findOne({
      subjectName: subjectId,
    });

    if (!subject) {
      subject = await Subject.create({
        subjectName: subjectId,
        testDuration: 60,
      });
    }

    // Find entrance exam
    let entranceExam = await EntranceExam.findOne({
      $or: [
        { entranceExamId: entranceExamId },
        { entranceExamName: entranceExamId },
      ],
    });

    if (!entranceExam) {
      const examNameMap: Record<string, string> = {
        CUET: "CUET",
        CET: "CET",
        JEE: "JEE Main",
        NEET: "NEET",
        CLAT: "CLAT",
        CAT: "CAT",
      };
      const examName = examNameMap[entranceExamId] || entranceExamId;

      entranceExam = await EntranceExam.create({
        entranceExamName: examName,
        entranceExamId: entranceExamId,
        durationMinutes: 180,
        subjects: [],
        markingScheme: {
          correctMarks: 4,
          incorrectMarks: -1,
          unansweredMarks: 0,
        },
      });
    }

    console.log(
      `Generating ${finalNumQuestions} questions for ${subject.subjectName} (${
        entranceExam.entranceExamName
      })${topic ? ` - Topic: ${topic}` : ""}`,
    );

    // Generate questions using subject knowledge
    const questions = await GenerateQuestionsFromSubjectKnowledge(
      subject.subjectName,
      entranceExam.entranceExamName,
      finalNumQuestions,
      topic || undefined,
    );

    let generatedQuestions = null;

    if (questions && Array.isArray(questions) && questions.length > 0) {
      // Format questions for database
      const formattedQuestions = questions.map((q: any) => ({
        questionsText: q.questionsText,
        Options: q.Options,
        correctOption: q.correctOption,
        SubjectId: subject._id,
        entranceExam: entranceExam._id,
        createdBy: userId || undefined,
      }));

      // Save questions to database
      generatedQuestions = await QuestionModel.insertMany(formattedQuestions);
      console.log(
        `Successfully generated and saved ${generatedQuestions.length} questions`,
      );
    } else {
      console.warn("No questions generated from AI service");
    }

    res.status(201).json({
      status: "Success",
      message: "Questions generated successfully",
      questionsGenerated: generatedQuestions?.length || 0,
      questions: generatedQuestions || undefined,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      message: "Error generating questions",
      error,
    });
  }
};
