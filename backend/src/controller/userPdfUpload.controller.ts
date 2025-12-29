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

/**
 * Check if user can upload a PDF (quota check)
 */
async function canUserUpload(
  userId: string
): Promise<{ allowed: boolean; nextUploadDate?: Date; lastUploadDate?: Date }> {
  const lastUpload = await UserPdfUpload.findOne({ userId })
    .sort({ uploadedAt: -1 })
    .select("uploadedAt");

  if (!lastUpload) {
    return { allowed: true };
  }

  const cooldownDate = new Date();
  cooldownDate.setDate(cooldownDate.getDate() - USER_PDF_COOLDOWN_DAYS);

  if (lastUpload.uploadedAt > cooldownDate) {
    const nextDate = new Date(lastUpload.uploadedAt);
    nextDate.setDate(nextDate.getDate() + USER_PDF_COOLDOWN_DAYS);
    return {
      allowed: false,
      nextUploadDate: nextDate,
      lastUploadDate: lastUpload.uploadedAt,
    };
  }

  return { allowed: true, lastUploadDate: lastUpload.uploadedAt };
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

    const quotaCheck = await canUserUpload(userId);

    res.status(200).json({
      success: true,
      canUpload: quotaCheck.allowed,
      nextUploadDate: quotaCheck.nextUploadDate || null,
      lastUploadDate: quotaCheck.lastUploadDate || null,
      cooldownDays: USER_PDF_COOLDOWN_DAYS,
      maxSizeMB: USER_PDF_MAX_SIZE_MB,
      maxPages: USER_PDF_MAX_PAGES,
      maxQuestions: USER_PDF_MAX_QUESTIONS,
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

    // Check quota
    const quotaCheck = await canUserUpload(userId);
    if (!quotaCheck.allowed) {
      res.status(429).json({
        message: `Upload limit reached. You can upload again after ${quotaCheck.nextUploadDate?.toLocaleDateString()}`,
        nextUploadDate: quotaCheck.nextUploadDate,
        cooldownDays: USER_PDF_COOLDOWN_DAYS,
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

    // Check quota again
    const quotaCheck = await canUserUpload(userId);
    if (!quotaCheck.allowed) {
      res.status(429).json({
        message: `Upload limit reached. You can upload again after ${quotaCheck.nextUploadDate?.toLocaleDateString()}`,
        nextUploadDate: quotaCheck.nextUploadDate,
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

    // Generate questions (max 100 for user uploads)
    let generatedQuestions = null;
    const numQuestions = USER_PDF_MAX_QUESTIONS;

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
