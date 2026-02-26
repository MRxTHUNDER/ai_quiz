import { JobsOptions, Queue } from "bullmq";
import { MAX_RETRIES, QUESTION_QUEUE_NAME } from "../env";
import { redisConnection } from "./connection";
import { QuestionGenerationPayload } from "../types/job.types";

export const questionQueue = new Queue<QuestionGenerationPayload>(
  QUESTION_QUEUE_NAME,
  {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: MAX_RETRIES,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        count: 200,
      },
      removeOnFail: false,
    },
  },
);

export const enqueueQuestionGenerationJob = async (
  payload: QuestionGenerationPayload,
  options?: JobsOptions,
) => {
  return questionQueue.add(payload.type, payload, options);
};
