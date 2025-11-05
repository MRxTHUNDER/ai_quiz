import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { Pdf } from "../models/pdf.model";
import { getPresignUploadUrl } from "../service/s3Service";

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

export const TagPDF = async (req: Request, res: Response) => {
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
      (sub: any) => sub.subject.toString() === subject._id.toString()
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

    res.status(201).json({
      status: "Success",
      message: "PDF tagged and registered successfully",
      pdf,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error tagging PDF",
      error,
    });
  }
};
