import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { Pdf } from "../models/pdf.model";
import { BackgroundJob } from "../models/backgroundJob.model";
import { getPresignUploadUrl } from "../service/s3Service";
import { enqueueQuestionGenerationJob } from "../queues/questionQueue";
import { R2_WORKER_URL } from "../env";

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

    const finalFileUrl = R2_WORKER_URL 
      ? `${R2_WORKER_URL}${R2_WORKER_URL.endsWith("/") ? "" : "/"}${key}`
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

    // Ensure proper URL concatenation - add / if base URL doesn't end with it
    // Key format is always "uploads/pdf/..." (no leading slash)
    const finalFileUrl = R2_WORKER_URL
      ? `${R2_WORKER_URL}${R2_WORKER_URL.endsWith("/") ? "" : "/"}${key}`
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

    const queuedJob = await enqueueQuestionGenerationJob({
      type: "generate_from_pdf",
      pdfId: pdf._id.toString(),
      pdfUrl: finalFileUrl,
      subjectId: subject._id.toString(),
      entranceExamId: entranceExam._id.toString(),
      userId,
      numQuestions: finalNumQuestions,
    });

    await BackgroundJob.create({
      externalJobId: String(queuedJob.id),
      type: "generate_from_pdf",
      userId,
      subjectId: subject._id,
      subjectName: subject.subjectName,
      entranceExamId: entranceExam._id,
      entranceExamName: entranceExam.entranceExamName,
      requestedQuestions: finalNumQuestions,
      generatedQuestions: 0,
      status: "queued",
    });

    res.status(201).json({
      status: "Success",
      message: "PDF tagged. Question generation is queued.",
      pdf,
      jobId: String(queuedJob.id),
      estimatedQuestions: finalNumQuestions,
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

    const queuedJob = await enqueueQuestionGenerationJob({
      type: "generate_direct",
      subjectId: subject._id.toString(),
      entranceExamId: entranceExam._id.toString(),
      topic: topic || undefined,
      userId,
      numQuestions: finalNumQuestions,
    });

    await BackgroundJob.create({
      externalJobId: String(queuedJob.id),
      type: "generate_direct",
      userId,
      subjectId: subject._id,
      subjectName: subject.subjectName,
      entranceExamId: entranceExam._id,
      entranceExamName: entranceExam.entranceExamName,
      requestedQuestions: finalNumQuestions,
      generatedQuestions: 0,
      status: "queued",
    });

    res.status(201).json({
      status: "Success",
      message: "Question generation is queued",
      jobId: String(queuedJob.id),
      estimatedQuestions: finalNumQuestions,
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({
      message: "Error generating questions",
      error,
    });
  }
};
