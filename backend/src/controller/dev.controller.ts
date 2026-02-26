import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { QuestionModel } from "../models/questions.model";
import { EntranceExam } from "../models/entranceExam.model";
import { TestModel } from "../models/test.model";
import { User } from "../models/user.model";
import { UserResult } from "../models/userResult.model";
import { Pdf } from "../models/pdf.model";
import { NODE_ENV } from "../env";

export const ClearDatabase = async (_req: Request, res: Response) => {
  if (NODE_ENV === "production") {
    return res.status(403).json({
      success: false,
      message: "This endpoint is not available in production",
    });
  }

  try {
    console.log("\n🗑️  Clearing all database data...");

    await Subject.deleteMany({});
    await QuestionModel.deleteMany({});
    await EntranceExam.deleteMany({});
    await TestModel.deleteMany({});
    await User.deleteMany({});
    await UserResult.deleteMany({});
    await Pdf.deleteMany({});

    console.log("✓ All database data cleared");

    return res.status(200).json({
      success: true,
      message: "All database data cleared successfully",
      clearedCollections: [
        "Subject",
        "QuestionModel",
        "EntranceExam",
        "TestModel",
        "User",
        "UserResult",
        "Pdf",
      ],
    });
  } catch (error: any) {
    console.error("❌ Error clearing database:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to clear database",
      error: error.message,
    });
  }
};
