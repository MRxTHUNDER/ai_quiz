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
import { QuestionGenerationPayload } from "../types/job.types";
import { formatDuration } from "../utils/formatDuration";
import { Summary } from "../models/summary.model";
import { OPENAI_MODEL_MINI } from "../env";
import { Chapter } from "../models/chapter.model";

const MAX_POST_DEDUPE_FILL_ROUNDS = 80;

interface HandlerResult {
  insertedQuestionIds: string[];
}

const saveQuestions = async (
  questions: any[],
  payload: QuestionGenerationPayload,
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
    chapterId:
      payload.type === "generate_from_pdf" ? payload.chapterId : undefined,
    chapterName:
      payload.type === "generate_from_pdf" ? payload.chapterName : undefined,
    chapterNickname:
      payload.type === "generate_from_pdf"
        ? payload.chapterNickname || undefined
        : undefined,
    topics: question.topics,
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
    // Normalize text helper
    const normalizeText = (text: string | undefined | null) =>
      (text || "").trim().toLowerCase();

    // Fetch existing questions for this subject
    const existing = await QuestionModel.find({
      SubjectId: payload.subjectId,
    }).select("questionsText");

    const existingTexts = new Set(
      existing
        .map((q: any) => normalizeText(q.questionsText))
        .filter((t) => t.length > 0),
    );

    const seenInBatch = new Set<string>();

    const dedupeList = (list: any[]) => {
      const result: any[] = [];
      for (const q of list) {
        const key = normalizeText(q.questionsText);
        if (!key) {
          result.push(q);
          continue;
        }
        if (existingTexts.has(key)) {
          continue; // already in DB for this subject
        }
        if (seenInBatch.has(key)) {
          continue; // duplicate within this generation run
        }
        seenInBatch.add(key);
        result.push(q);
      }
      return result;
    };

    // First dedupe the initially generated questions
    generatedQuestions = dedupeList(generatedQuestions);

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

        const extraDeduped = dedupeList(extraRaw);
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

  if (payload.type === "generate_from_pdf") {
    await Chapter.updateOne(
      { _id: payload.chapterId },
      {
        $inc: { totalQuestionsGenerated: insertedCount },
        $set: { lastGeneratedAt: new Date() },
      },
    );
  }

  return {
    insertedQuestionIds: insertedQuestions.map((q: any) => q._id.toString()),
  };
};
