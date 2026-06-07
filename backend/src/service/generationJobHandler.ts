import { Job } from "bullmq";
import { EntranceExam } from "../models/entranceExam.model";
import { Pdf } from "../models/pdf.model";
import { QuestionModel } from "../models/questions.model";
import { Subject } from "../models/subject.model";
import { UserPdfUpload } from "../models/userPdfUpload.model";
import { GenerateAIQuestions } from "./generateQuestion";
import { GenerateQuestionsFromSubjectKnowledge } from "./generateQuestionFromSubject";
import { getOrCreateSummary } from "./pdfSummary.service";
import { BackgroundJob } from "../models/backgroundJob.model";
import {
  ImportFromDocxPayload,
  QuestionGenerationPayload,
} from "../types/job.types";
import { extractQuestionsFromDocxBuffer } from "./docxParser.service";
import { getObjectBufferFromS3 } from "./s3Service";
import { formatDuration } from "../utils/formatDuration";
import { Summary } from "../models/summary.model";
import { OPENAI_MODEL_MINI } from "../env";

const MAX_POST_DEDUPE_FILL_ROUNDS = 80;

interface HandlerResult {
  insertedQuestionIds: string[];
}

const normalizeQuestionText = (text: string | undefined | null) =>
  (text || "").trim().toLowerCase();

const dedupeQuestionsForSubject = async (
  questions: any[],
  subjectId: string,
  seenInBatch: Set<string> = new Set(),
) => {
  const existing = await QuestionModel.find({ SubjectId: subjectId }).select(
    "questionsText",
  );

  const existingTexts = new Set(
    existing
      .map((q: any) => normalizeQuestionText(q.questionsText))
      .filter((t) => t.length > 0),
  );

  const result: any[] = [];

  for (const q of questions) {
    const key = normalizeQuestionText(q.questionsText);
    if (!key) {
      result.push(q);
      continue;
    }
    if (existingTexts.has(key)) {
      continue;
    }
    if (seenInBatch.has(key)) {
      continue;
    }
    seenInBatch.add(key);
    result.push(q);
  }

  return result;
};

const saveQuestions = async (
  questions: any[],
  payload: {
    subjectId: string;
    entranceExamId: string;
    userId: string;
  },
) => {
  if (!questions.length) {
    return [];
  }

  const formattedQuestions = questions.map((question: any) => ({
    questionsText: question.questionsText,
    Options: question.Options,
    correctOption: question.correctOption,
    SubjectId: payload.subjectId,
    entranceExam: payload.entranceExamId,
    topics: question.topics || [],
    createdBy: payload.userId,
  }));

  return QuestionModel.insertMany(formattedQuestions);
};

export const handleQuestionGenerationJob = async (
  job: Job<QuestionGenerationPayload>,
): Promise<HandlerResult> => {
  const { data: payload } = job;
  const externalJobId = String(job.id);

  const backgroundJob = await BackgroundJob.findOne({ externalJobId });
  if (!backgroundJob) {
    throw new Error("Background job record not found");
  }

  if (["completed", "failed", "cancelled"].includes(backgroundJob.status)) {
    return {
      insertedQuestionIds: [],
    };
  }

  const runStartedAt = new Date();

  await BackgroundJob.findOneAndUpdate({ externalJobId }, {
    $set: {
      status: "running",
      startedAt: runStartedAt,
      timeTaken: null,
    },
  });

  if (payload.type === "import_from_docx") {
    return handleDocxImportJob(payload, externalJobId, runStartedAt);
  }

  let generatedQuestions: any[] = [];

  const subject = await Subject.findById(payload.subjectId);
  if (!subject) {
    throw new Error("Subject not found");
  }

  const entranceExam = await EntranceExam.findById(payload.entranceExamId);
  if (!entranceExam) {
    throw new Error("Entrance exam not found");
  }

  if (payload.type === "generate_from_pdf") {
    const pdf = await Pdf.findById(payload.pdfId);
    if (!pdf) {
      throw new Error("PDF not found");
    }

    try {
      const summary = await getOrCreateSummary(
        payload.pdfId,
        payload.pdfUrl,
        payload.subjectId,
        payload.entranceExamId,
      );

      const summaryFromDb = summary?._id
        ? await Summary.findById(summary._id).select("summaryText")
        : null;

      const summaryText = summaryFromDb?.summaryText || summary?.summaryText;

      if (summaryText) {
        generatedQuestions = await GenerateAIQuestions(
          summaryText,
          payload.numQuestions,
          payload.subjectId,
          true,
          OPENAI_MODEL_MINI,
        );
      }
    } catch (error) {
      await job.log(`Summary generation failed: ${(error as Error).message}`);
    }

    if (!generatedQuestions.length) {
      generatedQuestions = await GenerateQuestionsFromSubjectKnowledge(
        subject.subjectName,
        entranceExam.entranceExamName,
        payload.numQuestions,
      );
    }
  }

  if (payload.type === "generate_direct") {
    generatedQuestions = await GenerateQuestionsFromSubjectKnowledge(
      subject.subjectName,
      entranceExam.entranceExamName,
      payload.numQuestions,
      payload.topic,
    );
  }

  // Deduplicate questions before saving and try to "top up" if we generated fewer
  // than requested:
  // - Remove exact duplicates within this batch
  // - Avoid inserting questions whose text already exists for this subject
  // - If, after dedupe, we still have fewer than payload.numQuestions, repeat
  //   subject-knowledge generation until we reach the target or stall (capped).
  if (generatedQuestions.length) {
    const seenInBatch = new Set<string>();

    generatedQuestions = await dedupeQuestionsForSubject(
      generatedQuestions,
      payload.subjectId,
      seenInBatch,
    );

    const requestedTotal =
      payload.numQuestions || generatedQuestions.length;
    let remainingNeeded = Math.max(
      0,
      requestedTotal - generatedQuestions.length,
    );

    let fillRound = 0;
    while (remainingNeeded > 0 && fillRound < MAX_POST_DEDUPE_FILL_ROUNDS) {
      fillRound += 1;
      try {
        const extraRaw = await GenerateQuestionsFromSubjectKnowledge(
          subject.subjectName,
          entranceExam.entranceExamName,
          remainingNeeded,
          payload.topic,
        );

        if (!extraRaw?.length) {
          break;
        }

        const extraDeduped = await dedupeQuestionsForSubject(
          extraRaw,
          payload.subjectId,
          seenInBatch,
        );
        if (!extraDeduped.length) {
          break;
        }

        generatedQuestions = generatedQuestions.concat(extraDeduped);
        remainingNeeded = Math.max(
          0,
          requestedTotal - generatedQuestions.length,
        );
      } catch (error) {
        console.error(
          "Error generating additional questions to fill requested count:",
          error,
        );
        break;
      }
    }
  }

  const insertedQuestions = await saveQuestions(generatedQuestions, payload);
  const insertedCount = insertedQuestions.length;

  await UserPdfUpload.updateOne(
    { backgroundJobId: externalJobId },
    {
      $set: {
        questionsGenerated: insertedCount,
      },
    },
  );

  await BackgroundJob.findOneAndUpdate({ externalJobId }, {
    $set: {
      status: "completed",
      generatedQuestions: insertedCount,
      completedAt: new Date(),
      timeTaken: formatDuration(Date.now() - runStartedAt.getTime()),
    },
  });

  return {
    insertedQuestionIds: insertedQuestions.map((q: any) => q._id.toString()),
  };
};

const handleDocxImportJob = async (
  payload: ImportFromDocxPayload,
  externalJobId: string,
  runStartedAt: Date,
): Promise<HandlerResult> => {
  console.log(`[docx-import] Job ${externalJobId} started (${payload.fileName})`);

  const docxBuffer = await getObjectBufferFromS3(payload.docxKey);
  const parsedQuestions = await extractQuestionsFromDocxBuffer(docxBuffer);

  await BackgroundJob.findOneAndUpdate(
    { externalJobId },
    { $set: { requestedQuestions: parsedQuestions.length } },
  );

  const newQuestions = await dedupeQuestionsForSubject(
    parsedQuestions,
    payload.subjectId,
  );

  const skippedDuplicates = parsedQuestions.length - newQuestions.length;
  if (skippedDuplicates > 0) {
    console.log(
      `[docx-import] Skipped ${skippedDuplicates} duplicate question(s) already in DB`,
    );
  }

  const insertedQuestions = await saveQuestions(newQuestions, payload);
  const insertedCount = insertedQuestions.length;

  console.log(
    `[docx-import] Job ${externalJobId} done: parsed=${parsedQuestions.length}, inserted=${insertedCount}`,
  );

  await BackgroundJob.findOneAndUpdate({ externalJobId }, {
    $set: {
      status: "completed",
      generatedQuestions: insertedCount,
      completedAt: new Date(),
      timeTaken: formatDuration(Date.now() - runStartedAt.getTime()),
    },
  });

  return {
    insertedQuestionIds: insertedQuestions.map((q: any) => q._id.toString()),
  };
};
