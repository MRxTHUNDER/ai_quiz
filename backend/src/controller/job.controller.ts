import { Request, Response } from "express";
import { BackgroundJob } from "../models/backgroundJob.model";

const serializeJob = (job: any) => ({
  id: job._id?.toString(),
  externalJobId: job.externalJobId,
  type: job.type,
  subjectId: job.subjectId || null,
  subjectName: job.subjectName || null,
  entranceExamId: job.entranceExamId || null,
  entranceExamName: job.entranceExamName || null,
  requestedQuestions: job.requestedQuestions || 0,
  generatedQuestions: job.generatedQuestions || 0,
  status: job.status,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt || null,
  completedAt: job.completedAt || null,
  timeTaken: job.timeTaken || null,
});

export const GetJobStatusForUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const job = await BackgroundJob.findOne({ externalJobId: id, userId });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.status(200).json({ success: true, job: serializeJob(job) });
  } catch (error) {
    console.error("Error fetching job status for user:", error);
    return res.status(500).json({ message: "Failed to fetch job status", error });
  }
};

export const GetJobStatusForAdmin = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const job = await BackgroundJob.findOne({ externalJobId: id });

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.status(200).json({ success: true, job: serializeJob(job) });
  } catch (error) {
    console.error("Error fetching job status for admin:", error);
    return res.status(500).json({ message: "Failed to fetch job status", error });
  }
};

export const GetActiveQuestionJobsForAdmin = async (
  req: Request,
  res: Response,
) => {
  try {
    const requestedType = (req.query.type as string | undefined) || undefined;

    const typeFilter =
      requestedType === "question-generation"
        ? ["generate_from_pdf", "generate_direct"]
        : requestedType === "generate_from_pdf" || requestedType === "generate_direct"
          ? [requestedType]
          : ["generate_from_pdf", "generate_direct"];

    const activeJobs = await BackgroundJob.find({
      status: { $in: ["queued", "running", "partial"] },
      type: { $in: typeFilter },
    })
      .sort({ updatedAt: -1 })
      .limit(20);

    return res.status(200).json({
      success: true,
      count: activeJobs.length,
      jobs: activeJobs.map(serializeJob),
    });
  } catch (error) {
    console.error("Error fetching active jobs:", error);
    return res.status(500).json({ message: "Failed to fetch active jobs", error });
  }
};
