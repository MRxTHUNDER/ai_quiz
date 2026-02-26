import { Worker } from "bullmq";
import { QUESTION_QUEUE_NAME, QUESTION_WORKER_CONCURRENCY } from "../env";
import { redisConnection, closeRedisConnection } from "../queues/connection";
import { QuestionGenerationPayload } from "../types/job.types";
import { handleQuestionGenerationJob } from "../service/generationJobHandler";
import { BackgroundJob } from "../models/backgroundJob.model";
import { formatDuration } from "../utils/formatDuration";

let workerInstance: Worker<QuestionGenerationPayload> | null = null;

export const startQuestionWorker = async () => {
  if (workerInstance) {
    return workerInstance;
  }

  const worker = new Worker<QuestionGenerationPayload>(
    QUESTION_QUEUE_NAME,
    async (job) => {
      return handleQuestionGenerationJob(job);
    },
    {
      connection: redisConnection,
      concurrency: QUESTION_WORKER_CONCURRENCY,
    },
  );

  worker.on("completed", async (job) => {
    console.log(`Job ${job.id} completed.`);
  });

  worker.on("failed", async (job, error) => {
    console.error(`Job ${job?.id} failed:`, error.message);

    const externalJobId = job?.id ? String(job.id) : undefined;
    if (!externalJobId) {
      return;
    }

    const existingJob = await BackgroundJob.findOne({ externalJobId });
    const completedAt = new Date();
    const startedAt = existingJob?.startedAt
      ? new Date(existingJob.startedAt)
      : null;

    await BackgroundJob.findOneAndUpdate({ externalJobId }, {
      $set: {
        status: "failed",
        completedAt,
        timeTaken: startedAt
          ? formatDuration(completedAt.getTime() - startedAt.getTime())
          : null,
      },
    });
  });

  console.log(
    `Question worker listening on queue '${QUESTION_QUEUE_NAME}' with concurrency ${QUESTION_WORKER_CONCURRENCY}`,
  );

  workerInstance = worker;
  return worker;
};

export const stopQuestionWorker = async () => {
  if (!workerInstance) {
    return;
  }

  await workerInstance.close();
  workerInstance = null;
  await closeRedisConnection();
};
