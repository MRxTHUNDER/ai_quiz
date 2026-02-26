import IORedis from "ioredis";
import { REDIS_URL } from "../env";

if (!REDIS_URL) {
  throw new Error("REDIS_URL is required to use BullMQ question generation queue.");
}

export const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export const closeRedisConnection = async () => {
  if (redisConnection.status !== "end") {
    await redisConnection.quit();
  }
};
