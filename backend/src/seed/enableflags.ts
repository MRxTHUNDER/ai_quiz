import mongoose from "mongoose";
import { EntranceExam } from "../models/entranceExam.model";
import { Subject } from "../models/subject.model";
import { ConnectToDb } from "../db/db";

async function backfillEnableFlags() {
  try {
    // Ensure DB connection (uses your existing helper)
    await ConnectToDb();

    console.log("Connected to DB. Starting backfill...");

    // 1) Set isEnabled: true on all Subject documents
    const subjectResult = await Subject.updateMany(
      { $or: [{ isEnabled: { $exists: false } }, { isEnabled: null }] },
      { $set: { isEnabled: true } }
    );
    console.log(
      `Subjects updated: matched=${subjectResult.matchedCount}, modified=${subjectResult.modifiedCount}`
    );

    // 2) Set isEnabled: true on all EntranceExam documents
    const examResult = await EntranceExam.updateMany(
      { $or: [{ isEnabled: { $exists: false } }, { isEnabled: null }] },
      { $set: { isEnabled: true } }
    );
    console.log(
      `Entrance exams updated: matched=${examResult.matchedCount}, modified=${examResult.modifiedCount}`
    );

    // 3) Set isEnabled: true on all embedded subjects inside each EntranceExam
    //    This will only touch entries where isEnabled is missing/null.
    const embeddedResult = await EntranceExam.updateMany(
      {},
      { $set: { "subjects.$[].isEnabled": true } }
    );
    console.log(
      `Embedded exam subjects updated (set isEnabled=true on all entries): matched=${embeddedResult.matchedCount}, modified=${embeddedResult.modifiedCount}`
    );

    console.log("Backfill complete.");
  } catch (err) {
    console.error("Error during backfill:", err);
  } finally {
    await mongoose.connection.close();
    console.log("DB connection closed.");
  }
}

backfillEnableFlags().catch((err) => {
  console.error("Unhandled error in backfill script:", err);
});