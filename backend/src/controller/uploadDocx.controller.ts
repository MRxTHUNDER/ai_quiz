import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { BackgroundJob } from "../models/backgroundJob.model";
import { uploadBufferToS3 } from "../service/s3Service";
import { enqueueQuestionGenerationJob } from "../queues/questionQueue";

const resolveSubjectAndExam = async (
  subjectId: string,
  entranceExamId: string,
) => {
  let subject = await Subject.findOne({ subjectName: subjectId });

  if (!subject) {
    subject = await Subject.create({
      subjectName: subjectId,
      testDuration: 60,
    });
  }

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

  const subjectExists = entranceExam.subjects.some(
    (sub: { subject: { toString: () => string } }) =>
      sub.subject.toString() === subject._id.toString(),
  );

  if (!subjectExists) {
    entranceExam.subjects.push({
      subject: subject._id,
      durationMinutes: subject.testDuration || 60,
    });
    await entranceExam.save();
  }

  return { subject, entranceExam };
};

export const UploadQuestionsDocx = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { entranceExamId, subjectId } = req.body;
    const file = req.file;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    if (!entranceExamId || !subjectId) {
      res.status(400).json({
        message: "entranceExamId and subjectId are required",
      });
      return;
    }

    if (!file) {
      res.status(400).json({ message: "DOCX file is required" });
      return;
    }

    const { subject, entranceExam } = await resolveSubjectAndExam(
      subjectId,
      entranceExamId,
    );

    const contentType =
      file.mimetype ||
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const { key } = await uploadBufferToS3(
      file.buffer,
      file.originalname,
      contentType,
      "docx",
    );

    const externalJobId = randomUUID();

    await BackgroundJob.create({
      externalJobId,
      type: "import_from_docx",
      userId,
      subjectId: subject._id,
      subjectName: subject.subjectName,
      entranceExamId: entranceExam._id,
      entranceExamName: entranceExam.entranceExamName,
      requestedQuestions: 0,
      generatedQuestions: 0,
      status: "queued",
    });

    try {
      await enqueueQuestionGenerationJob(
        {
          type: "import_from_docx",
          docxKey: key,
          fileName: file.originalname,
          subjectId: subject._id.toString(),
          entranceExamId: entranceExam._id.toString(),
          userId,
        },
        { jobId: externalJobId },
      );
    } catch (queueError) {
      await BackgroundJob.findOneAndUpdate(
        { externalJobId },
        {
          $set: {
            status: "failed",
            completedAt: new Date(),
          },
        },
      );
      throw queueError;
    }

    res.status(201).json({
      status: "Success",
      message:
        "DOCX uploaded. Questions are being extracted — this usually takes 1–3 minutes.",
      jobId: externalJobId,
    });
  } catch (error) {
    console.error("Error uploading DOCX:", error);
    res.status(500).json({
      message: "Error uploading DOCX",
      error: error instanceof Error ? error.message : error,
    });
  }
};
