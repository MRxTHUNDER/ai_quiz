import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { Pdf } from "../models/pdf.model";
import { UserPdfUpload } from "../models/userPdfUpload.model";
import { getPresignUploadUrl } from "../service/s3Service";
import { GenerateAIQuestions } from "../service/generateQuestion";
import { QuestionModel } from "../models/questions.model";
import { getOrCreateSummary } from "../service/pdfSummary.service";
import { GenerateQuestionsFromSubjectKnowledge } from "../service/generateQuestionFromSubject";
import { PDFDocument } from "pdf-lib";

// Configuration from environment variables
const USER_PDF_COOLDOWN_DAYS = Number(process.env.USER_PDF_COOLDOWN_DAYS || 15);
const USER_PDF_MAX_SIZE_MB = Number(process.env.USER_PDF_MAX_SIZE_MB || 5);
const USER_PDF_MAX_PAGES = Number(process.env.USER_PDF_MAX_PAGES || 30);
const USER_PDF_MAX_QUESTIONS = Number(
  process.env.USER_PDF_MAX_QUESTIONS || 100
);
const MAX_QUESTIONS_PER_PERIOD = 50; // Max 50 questions per 15 days

/**
 * Check if user has uploaded PDF before (can only upload once)
 */
async function hasUserUploadedPdf(
  userId: string
): Promise<{ hasUploaded: boolean; uploadDate?: Date }> {
  const pdfUpload = await UserPdfUpload.findOne({
    userId,
    pdfId: { $exists: true, $ne: null },
  })
    .sort({ uploadedAt: -1 })
    .select("uploadedAt");

  if (!pdfUpload) {
    return { hasUploaded: false };
  }

  return { hasUploaded: true, uploadDate: pdfUpload.uploadedAt };
}

/**
 * Check if user can generate questions (max 50 per 15 days)
 */
async function canUserGenerateQuestions(userId: string): Promise<{
  allowed: boolean;
  questionsGenerated: number;
  questionsRemaining: number;
  nextResetDate?: Date;
  periodStartDate?: Date;
}> {
  const periodStartDate = new Date();
  periodStartDate.setDate(periodStartDate.getDate() - USER_PDF_COOLDOWN_DAYS);

  // Get all uploads/generations in the last 15 days
  const recentGenerations = await UserPdfUpload.find({
    userId,
    uploadedAt: { $gte: periodStartDate },
  }).select("questionsGenerated uploadedAt");

  // Calculate total questions generated in the period
  const questionsGenerated = recentGenerations.reduce(
    (sum, gen) => sum + (gen.questionsGenerated || 0),
    0
  );

  const questionsRemaining = Math.max(
    0,
    MAX_QUESTIONS_PER_PERIOD - questionsGenerated
  );
  const allowed = questionsGenerated < MAX_QUESTIONS_PER_PERIOD;

  // Calculate next reset date (15 days from the oldest generation in period, or now if none)
  let nextResetDate: Date | undefined;
  if (recentGenerations.length > 0) {
    const oldestGeneration = recentGenerations.reduce((oldest, gen) =>
      gen.uploadedAt < oldest.uploadedAt ? gen : oldest
    );
    nextResetDate = new Date(oldestGeneration.uploadedAt);
    nextResetDate.setDate(nextResetDate.getDate() + USER_PDF_COOLDOWN_DAYS);
  }

  return {
    allowed,
    questionsGenerated,
    questionsRemaining,
    nextResetDate,
    periodStartDate,
  };
}

/**
 * Check if user can upload a PDF (can only upload once, ever)
 */
async function canUserUploadPdf(userId: string): Promise<{
  allowed: boolean;
  hasUploadedBefore: boolean;
  uploadDate?: Date;
}> {
  const pdfCheck = await hasUserUploadedPdf(userId);

  if (pdfCheck.hasUploaded) {
    return {
      allowed: false,
      hasUploadedBefore: true,
      uploadDate: pdfCheck.uploadDate,
    };
  }

  return { allowed: true, hasUploadedBefore: false };
}

export const CheckUploadQuota = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    // Check PDF upload eligibility (can only upload once)
    const pdfUploadCheck = await canUserUploadPdf(userId);

    // Check question generation eligibility (max 50 per 15 days)
    const questionGenCheck = await canUserGenerateQuestions(userId);

    res.status(200).json({
      success: true,
      canUploadPdf: pdfUploadCheck.allowed,
      hasUploadedPdfBefore: pdfUploadCheck.hasUploadedBefore,
      pdfUploadDate: pdfUploadCheck.uploadDate || null,
      canGenerateQuestions: questionGenCheck.allowed,
      questionsGeneratedInPeriod: questionGenCheck.questionsGenerated,
      questionsRemaining: questionGenCheck.questionsRemaining,
      nextResetDate: questionGenCheck.nextResetDate || null,
      periodStartDate: questionGenCheck.periodStartDate || null,
      cooldownDays: USER_PDF_COOLDOWN_DAYS,
      maxSizeMB: USER_PDF_MAX_SIZE_MB,
      maxPages: USER_PDF_MAX_PAGES,
      maxQuestions: USER_PDF_MAX_QUESTIONS,
      maxQuestionsPerPeriod: MAX_QUESTIONS_PER_PERIOD,
    });
  } catch (error) {
    console.error("Error checking upload quota:", error);
    res.status(500).json({
      message: "Error checking upload quota",
      error,
    });
  }
};

/**
 * Get presigned URL for user PDF upload (with quota check)
 * POST /user/upload/presigned-url
 */
export const GetUserPresignedUrl = async (req: Request, res: Response) => {
  try {
    const { contentType, fileName } = req.body;
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        message: "User not authenticated",
      });
      return;
    }

    if (!contentType || !fileName) {
      res.status(400).json({
        message: "contentType and fileName required",
      });
      return;
    }

    // Check PDF upload quota (can only upload once)
    const pdfUploadCheck = await canUserUploadPdf(userId);
    if (!pdfUploadCheck.allowed) {
      res.status(429).json({
        message: `PDF upload limit reached. You can only upload a PDF once.`,
        hasUploadedBefore: true,
        uploadDate: pdfUploadCheck.uploadDate,
      });
      return;
    }

    // Check question generation quota (max 50 per 15 days)
    const questionGenCheck = await canUserGenerateQuestions(userId);
    if (!questionGenCheck.allowed) {
      res.status(429).json({
        message: `Question generation limit reached. You have generated ${questionGenCheck.questionsGenerated} questions in the last ${USER_PDF_COOLDOWN_DAYS} days. Maximum allowed is ${MAX_QUESTIONS_PER_PERIOD} questions per ${USER_PDF_COOLDOWN_DAYS} days.`,
        questionsGenerated: questionGenCheck.questionsGenerated,
        nextResetDate: questionGenCheck.nextResetDate,
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

/**
 * Validate PDF (size and page count)
 */
async function validatePDF(
  fileBuffer: Buffer,
  fileSizeMB: number
): Promise<{ valid: boolean; error?: string; pageCount?: number }> {
  // Check file size
  if (fileSizeMB > USER_PDF_MAX_SIZE_MB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(
        2
      )}MB) exceeds maximum allowed size of ${USER_PDF_MAX_SIZE_MB}MB`,
    };
  }

  // Check page count using pdf-lib
  try {
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pageCount = pdfDoc.getPageCount();

    if (pageCount > USER_PDF_MAX_PAGES) {
      return {
        valid: false,
        error: `PDF has ${pageCount} pages, exceeding maximum allowed ${USER_PDF_MAX_PAGES} pages`,
        pageCount,
      };
    }

    return { valid: true, pageCount };
  } catch (error) {
    console.error("Error validating PDF:", error);
    return {
      valid: false,
      error: "Failed to validate PDF. Please ensure the file is a valid PDF.",
    };
  }
}

/**
 * Tag user-uploaded PDF and generate questions
 * POST /user/upload/tag
 */
export const TagUserPDF = async (req: Request, res: Response) => {
  try {
    const { fileName, key, subjectId, entranceExamId } = req.body;
    const userId = req.userId;

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

    // Check PDF upload quota (can only upload once)
    const pdfUploadCheck = await canUserUploadPdf(userId);
    if (!pdfUploadCheck.allowed) {
      res.status(429).json({
        message: `PDF upload limit reached. You can only upload a PDF once.`,
        hasUploadedBefore: true,
        uploadDate: pdfUploadCheck.uploadDate,
      });
      return;
    }

    // Check question generation quota (max 50 per 15 days)
    const questionGenCheck = await canUserGenerateQuestions(userId);
    if (!questionGenCheck.allowed) {
      res.status(429).json({
        message: `Question generation limit reached. You have generated ${questionGenCheck.questionsGenerated} questions in the last ${USER_PDF_COOLDOWN_DAYS} days. Maximum allowed is ${MAX_QUESTIONS_PER_PERIOD} questions per ${USER_PDF_COOLDOWN_DAYS} days.`,
        questionsGenerated: questionGenCheck.questionsGenerated,
        nextResetDate: questionGenCheck.nextResetDate,
      });
      return;
    }

    // Find or create subject by name (subjectId is actually the subject name)
    let subject = await Subject.findOne({
      subjectName: subjectId,
    });

    if (!subject) {
      subject = await Subject.create({
        subjectName: subjectId,
        testDuration: 60, // Default duration
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
      });
    }

    // Ensure subject is in entrance exam
    const subjectExists = entranceExam.subjects.some(
      (sub: any) => sub.subject.toString() === subject._id.toString()
    );

    if (!subjectExists) {
      const durationMinutes = subject.testDuration || 60;
      entranceExam.subjects.push({
        subject: subject._id,
        durationMinutes: durationMinutes,
        totalQuestions: 50,
      });
      await entranceExam.save();
    }

    const r2WorkerUrl = process.env.R2_WORKER_URL || "";
    const finalFileUrl = r2WorkerUrl
      ? `${r2WorkerUrl}${r2WorkerUrl.endsWith("/") ? "" : "/"}${key}`
      : key;

    // Create PDF record
    const pdf = await Pdf.create({
      fileName,
      fileUrl: finalFileUrl,
      key,
      subject: subject._id,
      entranceExam: entranceExam._id,
      uploadedBy: userId,
    });

    // Get or create summary for this PDF (with topic matching)
    let summary = null;
    try {
      console.log("Processing PDF summary for user upload...");
      summary = await getOrCreateSummary(
        pdf._id.toString(),
        finalFileUrl,
        subject._id.toString(),
        entranceExam._id.toString()
      );
      console.log("Summary processed successfully");
    } catch (summaryError) {
      console.error("Error processing summary:", summaryError);
      // Don't fail the request if summary generation fails
    }

    // Check remaining question quota and adjust numQuestions accordingly
    const questionGenCheckForPDF = await canUserGenerateQuestions(userId);
    const numQuestions = Math.min(
      USER_PDF_MAX_QUESTIONS,
      questionGenCheckForPDF.questionsRemaining,
      MAX_QUESTIONS_PER_PERIOD
    );

    if (numQuestions <= 0) {
      // Still record the PDF upload even if we can't generate questions
      await UserPdfUpload.create({
        userId,
        pdfId: pdf._id,
        uploadedAt: new Date(),
        questionsGenerated: 0,
      });

      res.status(201).json({
        status: "Success",
        message:
          "PDF uploaded successfully, but question generation limit reached. No questions generated.",
        pdf,
        questionsGenerated: 0,
        warning: `You have reached the limit of ${MAX_QUESTIONS_PER_PERIOD} questions per ${USER_PDF_COOLDOWN_DAYS} days.`,
      });
      return;
    }

    // Generate questions (respecting quota)
    let generatedQuestions = null;

    try {
      console.log(
        `Generating ${numQuestions} questions for user PDF: ${subject.subjectName}`
      );

      let questions = null;

      // Try summary-based generation first if summary exists
      if (summary?.summaryText) {
        try {
          console.log("Attempting question generation from summary...");
          questions = await GenerateAIQuestions(
            summary.summaryText,
            numQuestions,
            subject._id.toString(),
            true
          );
          console.log(
            `Successfully generated ${
              questions?.length || 0
            } questions from summary`
          );
        } catch (summaryGenError) {
          console.error("Summary-based generation failed:", summaryGenError);
          questions = null;
        }
      }

      // Fallback: Generate questions based on subject knowledge (no PDF/summary needed)
      if (!questions || questions.length === 0) {
        console.log(
          `Generating questions from subject knowledge: ${subject.subjectName} (${entranceExam.entranceExamName})...`
        );
        questions = await GenerateQuestionsFromSubjectKnowledge(
          subject.subjectName,
          entranceExam.entranceExamName,
          numQuestions
        );
        console.log(
          `Generated ${questions?.length || 0} questions from subject knowledge`
        );
      }

      if (questions && Array.isArray(questions) && questions.length > 0) {
        const formattedQuestions = questions.map((q: any) => ({
          questionsText: q.questionsText,
          Options: q.Options,
          correctOption: q.correctOption,
          SubjectId: subject._id,
          embedding: q.embedding,
          topics: q.topics,
          createdBy: userId || undefined,
        }));

        generatedQuestions = await QuestionModel.insertMany(formattedQuestions);
        console.log(
          `Successfully generated and saved ${generatedQuestions.length} questions`
        );

        // Record the upload in UserPdfUpload
        await UserPdfUpload.create({
          userId,
          pdfId: pdf._id,
          uploadedAt: new Date(),
          questionsGenerated: generatedQuestions.length,
        });
      } else {
        console.warn("No questions generated from AI service");
      }
    } catch (questionError) {
      console.error("Error generating questions:", questionError);
      // Still record the upload even if question generation fails
      await UserPdfUpload.create({
        userId,
        pdfId: pdf._id,
        uploadedAt: new Date(),
        questionsGenerated: 0,
      });
    }

    res.status(201).json({
      status: "Success",
      message: "PDF uploaded and questions generated successfully",
      pdf,
      questionsGenerated: generatedQuestions?.length || 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error tagging user PDF",
      error,
    });
  }
};

/**
 * Generate questions directly without PDF for users
 * POST /user/upload/generate-direct
 */
export const GenerateQuestionsDirectUser = async (
  req: Request,
  res: Response
) => {
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

    // Check question generation quota (max 50 per 15 days)
    const questionGenCheck = await canUserGenerateQuestions(userId);
    if (!questionGenCheck.allowed) {
      res.status(429).json({
        message: `Question generation limit reached. You have generated ${questionGenCheck.questionsGenerated} questions in the last ${USER_PDF_COOLDOWN_DAYS} days. Maximum allowed is ${MAX_QUESTIONS_PER_PERIOD} questions per ${USER_PDF_COOLDOWN_DAYS} days.`,
        questionsGenerated: questionGenCheck.questionsGenerated,
        nextResetDate: questionGenCheck.nextResetDate,
      });
      return;
    }

    // Calculate final number of questions, respecting both max limit and remaining quota
    const requestedQuestions =
      numQuestions && numQuestions <= USER_PDF_MAX_QUESTIONS
        ? numQuestions
        : USER_PDF_MAX_QUESTIONS;

    // Don't exceed remaining quota
    const finalNumQuestions = Math.min(
      requestedQuestions,
      questionGenCheck.questionsRemaining,
      MAX_QUESTIONS_PER_PERIOD
    );

    if (finalNumQuestions <= 0) {
      res.status(429).json({
        message: `Cannot generate questions. You have reached the limit of ${MAX_QUESTIONS_PER_PERIOD} questions per ${USER_PDF_COOLDOWN_DAYS} days.`,
        questionsGenerated: questionGenCheck.questionsGenerated,
        questionsRemaining: questionGenCheck.questionsRemaining,
        nextResetDate: questionGenCheck.nextResetDate,
      });
      return;
    }

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
      })${topic ? ` - Topic: ${topic}` : ""}`
    );

    // Generate questions using subject knowledge
    const questions = await GenerateQuestionsFromSubjectKnowledge(
      subject.subjectName,
      entranceExam.entranceExamName,
      finalNumQuestions,
      topic || undefined
    );

    let generatedQuestions = null;

    if (questions && Array.isArray(questions) && questions.length > 0) {
      // Format questions for database
      const formattedQuestions = questions.map((q: any) => ({
        questionsText: q.questionsText,
        Options: q.Options,
        correctOption: q.correctOption,
        SubjectId: subject._id,
        createdBy: userId || undefined,
      }));

      // Save questions to database
      generatedQuestions = await QuestionModel.insertMany(formattedQuestions);
      console.log(
        `Successfully generated and saved ${generatedQuestions.length} questions`
      );
    } else {
      console.warn("No questions generated from AI service");
    }

    // Record this generation for quota tracking
    await UserPdfUpload.create({
      userId,
      questionsGenerated: generatedQuestions?.length || 0,
    });

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
