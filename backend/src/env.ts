import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

export const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const PORT = process.env.PORT || "8080"; // used in index.ts file

export const productionOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
  : [];

export const NODE_ENV = process.env.NODE_ENV;

export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export const R2_WORKER_URL = process.env.R2_WORKER_URL || "";

export const USER_PDF_COOLDOWN_DAYS = Number(
  process.env.USER_PDF_COOLDOWN_DAYS || 15,
);
export const USER_PDF_MAX_SIZE_MB = Number(
  process.env.USER_PDF_MAX_SIZE_MB || 5,
);
export const USER_PDF_MAX_PAGES = Number(process.env.USER_PDF_MAX_PAGES || 30);
export const USER_PDF_MAX_QUESTIONS = Number(
  process.env.USER_PDF_MAX_QUESTIONS || 100,
);
export const MAX_QUESTIONS_PER_PERIOD = 50; // Max 50 questions per 15 days

export const DbConnection =
  process.env.MONGODB_URL || "mongodb://localhost:27018/quiz";

export const BATCH_SIZE = process.env.QUESTION_BATCH_SIZE
  ? Number(process.env.QUESTION_BATCH_SIZE)
  : 50;

export const QUESTION_BATCH_DELAY_MS = Number(
  process.env.QUESTION_BATCH_DELAY_MS || 2000,
);

export const QUESTION_QUEUE_NAME =
  process.env.QUESTION_QUEUE_NAME || "question-generation";

export const REDIS_URL = process.env.REDIS_URL || "";

export const MAX_RETRIES = Number(process.env.MAX_RETRIES || 3);

export const QUESTION_WORKER_CONCURRENCY = Number(
  process.env.QUESTION_WORKER_CONCURRENCY || 1,
);

export const SIMILARITY_THRESHOLD = Number(
  process.env.DUPLICATE_SIMILARITY_THRESHOLD || 0.85,
);

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

export const numQuestionsEnv = process.env.NUM_QUESTIONS;

export const OPENAI_MODEL_MINI = process.env.OPENAI_MODEL_MINI || "gpt-4o-mini";

export const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL;
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "";

export const USER_JWT_SECRET = process.env.USER_JWT_SECRET || "user_secret_key";
export const ADMIN_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || "admin_secret_key";

const REQUIRED_ENV_KEYS = [
  "OPENAI_API_KEY",
  "PORT",
  "FRONTEND_URL",
  "NODE_ENV",
  "ADMIN_PASSWORD",
  "COOKIE_DOMAIN",
  "R2_WORKER_URL",
  "USER_PDF_COOLDOWN_DAYS",
  "USER_PDF_MAX_SIZE_MB",
  "USER_PDF_MAX_PAGES",
  "USER_PDF_MAX_QUESTIONS",
  "MONGODB_URL",
  "QUESTION_BATCH_SIZE",
  "QUESTION_BATCH_DELAY_MS",
  "QUESTION_QUEUE_NAME",
  "REDIS_URL",
  "MAX_RETRIES",
  "QUESTION_WORKER_CONCURRENCY",
  "DUPLICATE_SIMILARITY_THRESHOLD",
  "OPENAI_MODEL",
  "NUM_QUESTIONS",
  "OPENAI_MODEL_MINI",
  "R2_ENDPOINT_URL",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "USER_JWT_SECRET",
  "ADMIN_JWT_SECRET",
] as const;

export const validateRequiredEnvVars = () => {
  const missingKeys = REQUIRED_ENV_KEYS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value.trim() === "";
  });

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }
};
