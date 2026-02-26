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
