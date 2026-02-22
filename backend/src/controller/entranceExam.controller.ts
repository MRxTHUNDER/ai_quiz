import { Request, Response } from "express";
import { EntranceExam } from "../models/entranceExam.model";
import { Subject } from "../models/subject.model";

export const GetAllEntranceExams = async (req: Request, res: Response) => {
  try {
    const includeDisabled =
      typeof req.query.includeDisabled === "string"
        ? req.query.includeDisabled === "true"
        : false;

    // For public/user-facing calls, only return enabled exams
    const query = includeDisabled ? {} : { isEnabled: true };

    const exams = await EntranceExam.find(query)
      .populate({
        path: "subjects.subject",
        select: "subjectName testDuration isEnabled",
      })
      .sort({ displayOrder: 1, createdAt: -1 });

    // When not including disabled, also filter out disabled subjects
    const filteredExams = includeDisabled
      ? exams
      : exams.map((exam) => {
          const subjects =
            (exam.subjects || []).filter((sub: any) => {
              const subjectDoc: any = sub.subject;
              const subjectEnabled =
                subjectDoc && subjectDoc.isEnabled !== false;
              const entryEnabled = sub.isEnabled !== false;
              return subjectEnabled && entryEnabled;
            }) ?? [];

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const examAny: any = exam;
          examAny.subjects = subjects;
          return examAny;
        });

    res.status(200).json({
      message: "Entrance exams retrieved successfully",
      exams: filteredExams,
    });
  } catch (error) {
    console.error("Error fetching entrance exams:", error);
    res.status(500).json({
      message: "Something went wrong while fetching entrance exams",
      error,
    });
  }
};

export const GetEntranceExamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeDisabled =
      typeof req.query.includeDisabled === "string"
        ? req.query.includeDisabled === "true"
        : false;

    const query = includeDisabled ? { _id: id } : { _id: id, isEnabled: true };

    const exam = await EntranceExam.findOne(query).populate({
      path: "subjects.subject",
      select: "subjectName testDuration isEnabled",
    });

    if (!exam) {
      res.status(404).json({
        message: "Entrance exam not found",
      });
      return;
    }

    // When not including disabled, filter out disabled subjects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const examAny: any = exam;
    if (!includeDisabled && Array.isArray(examAny.subjects)) {
      examAny.subjects = examAny.subjects.filter((sub: any) => {
        const subjectDoc: any = sub.subject;
        const subjectEnabled = subjectDoc && subjectDoc.isEnabled !== false;
        const entryEnabled = sub.isEnabled !== false;
        return subjectEnabled && entryEnabled;
      });
    }

    res.status(200).json({
      message: "Entrance exam retrieved successfully",
      exam: examAny,
    });
  } catch (error) {
    console.error("Error fetching entrance exam:", error);
    res.status(500).json({
      message: "Something went wrong while fetching entrance exam",
      error,
    });
  }
};

export const createEntranceExam = async (req: Request, res: Response) => {
  try {
    const {
      entranceExamName,
      entranceExamId,
      durationMinutes,
      subjects,
      notes,
      isEnabled,
      bannerImageUrl,
      description,
      bannerSubjects,
      weeklyLimit,
    } = req.body;

    if (!entranceExamName || !entranceExamId || !durationMinutes) {
      res.status(400).json({
        message:
          "entranceExamName, entranceExamId, and durationMinutes are required",
      });
      return;
    }

    const existingExam = await EntranceExam.findOne({
      $or: [{ entranceExamName }, { entranceExamId }],
    });

    if (existingExam) {
      res.status(400).json({
        message: "Entrance exam with this name or ID already exists",
      });
      return;
    }

    // Validate and process subjects
    const processedSubjects: any[] = [];
    if (subjects && Array.isArray(subjects)) {
      for (const sub of subjects) {
        if (!sub.subjectName || !sub.durationMinutes) {
          res.status(400).json({
            message: "Each subject must have subjectName and durationMinutes",
          });
          return;
        }

        // Validate totalQuestions if provided
        if (
          sub.totalQuestions !== undefined &&
          (isNaN(Number(sub.totalQuestions)) || Number(sub.totalQuestions) < 1)
        ) {
          res.status(400).json({
            message: "totalQuestions must be a positive number",
          });
          return;
        }

        // Find or create subject
        let subject = await Subject.findOne({ subjectName: sub.subjectName });
        if (!subject) {
          subject = await Subject.create({
            subjectName: sub.subjectName,
            testDuration: sub.durationMinutes,
          });
        }

        processedSubjects.push({
          subject: subject._id,
          durationMinutes: sub.durationMinutes,
          totalQuestions: sub.totalQuestions || 50, // Default to 50 if not provided
          isEnabled: typeof sub.isEnabled === "boolean" ? sub.isEnabled : true,
        });
      }
    }

    // Get the highest displayOrder to set new exam at the end
    const maxOrderExam = await EntranceExam.findOne({})
      .sort({ displayOrder: -1 })
      .select("displayOrder");
    const nextDisplayOrder = maxOrderExam?.displayOrder
      ? maxOrderExam.displayOrder + 1
      : 0;

    const exam = await EntranceExam.create({
      entranceExamName,
      entranceExamId,
      durationMinutes,
      subjects: processedSubjects,
      notes: notes || "",
      isEnabled: typeof isEnabled === "boolean" ? isEnabled : true,
      displayOrder: nextDisplayOrder,
      bannerImageUrl: bannerImageUrl || "",
      description:
        description ||
        `Prepare for ${entranceExamName} with AI-powered quizzes customized across diverse subjects. Our AI ensures you're ready for entrance tests with adaptive and comprehensive practice.`,
      bannerSubjects: Array.isArray(bannerSubjects) ? bannerSubjects : [],
      weeklyLimit: typeof weeklyLimit === "number" ? weeklyLimit : 7,
    });

    const populatedExam = await EntranceExam.findById(exam._id).populate({
      path: "subjects.subject",
      select: "subjectName testDuration isEnabled",
    });

    res.status(201).json({
      message: "Entrance exam created successfully",
      exam: populatedExam,
    });
    return;
  } catch (error: any) {
    console.error("Error creating entrance exam:", error);
    if (error.code === 11000) {
      res.status(400).json({
        message: "Entrance exam with this name or ID already exists",
      });
      return;
    }
    res.status(500).json({
      message: "Something went wrong while creating entrance exam",
      error: error.message,
    });
    return;
  }
};

export const updateEntranceExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      entranceExamName,
      entranceExamId,
      durationMinutes,
      subjects,
      notes,
      isEnabled,
      bannerImageUrl,
      description,
      bannerSubjects,
      weeklyLimit,
    } = req.body;

    const exam = await EntranceExam.findById(id);
    if (!exam) {
      res.status(404).json({
        message: "Entrance exam not found",
      });
      return;
    }

    // Check if name or ID conflicts with another exam
    if (entranceExamName || entranceExamId) {
      const existingExam = await EntranceExam.findOne({
        $and: [
          { _id: { $ne: id } },
          {
            $or: [
              entranceExamName ? { entranceExamName } : {},
              entranceExamId ? { entranceExamId } : {},
            ],
          },
        ],
      });

      if (existingExam) {
        res.status(400).json({
          message: "Entrance exam with this name or ID already exists",
        });
        return;
      }
    }

    // Update basic fields
    if (entranceExamName) exam.entranceExamName = entranceExamName;
    if (entranceExamId) exam.entranceExamId = entranceExamId;
    if (durationMinutes) exam.durationMinutes = durationMinutes;
    if (notes !== undefined) exam.notes = notes;
    if (typeof isEnabled === "boolean") exam.isEnabled = isEnabled;
    if (bannerImageUrl !== undefined) exam.bannerImageUrl = bannerImageUrl;
    if (description !== undefined) exam.description = description;
    if (bannerSubjects !== undefined)
      exam.bannerSubjects = Array.isArray(bannerSubjects) ? bannerSubjects : [];
    if (typeof weeklyLimit === "number") exam.weeklyLimit = weeklyLimit;

    // Update subjects if provided
    if (subjects && Array.isArray(subjects)) {
      const processedSubjects: any[] = [];
      for (const sub of subjects) {
        if (!sub.subjectName || !sub.durationMinutes) {
          res.status(400).json({
            message: "Each subject must have subjectName and durationMinutes",
          });
          return;
        }

        // Validate totalQuestions if provided
        if (
          sub.totalQuestions !== undefined &&
          (isNaN(Number(sub.totalQuestions)) || Number(sub.totalQuestions) < 1)
        ) {
          res.status(400).json({
            message: "totalQuestions must be a positive number",
          });
          return;
        }

        // Find or create subject
        let subject = await Subject.findOne({ subjectName: sub.subjectName });
        if (!subject) {
          subject = await Subject.create({
            subjectName: sub.subjectName,
            testDuration: sub.durationMinutes,
          });
        }

        processedSubjects.push({
          subject: subject._id,
          durationMinutes: sub.durationMinutes,
          totalQuestions: sub.totalQuestions || 50, // Default to 50 if not provided
          isEnabled: typeof sub.isEnabled === "boolean" ? sub.isEnabled : true,
        });
      }
      // Clear existing subjects and set new ones
      exam.subjects.splice(0, exam.subjects.length);
      processedSubjects.forEach((sub) => {
        exam.subjects.push(sub);
      });
    }

    await exam.save();

    const populatedExam = await EntranceExam.findById(exam._id).populate({
      path: "subjects.subject",
      select: "subjectName testDuration isEnabled",
    });

    res.status(200).json({
      message: "Entrance exam updated successfully",
      exam: populatedExam,
    });
    return;
  } catch (error: any) {
    console.error("Error updating entrance exam:", error);
    if (error.code === 11000) {
      res.status(400).json({
        message: "Entrance exam with this name or ID already exists",
      });
      return;
    }
    res.status(500).json({
      message: "Something went wrong while updating entrance exam",
      error: error.message,
    });
    return;
  }
};

export const deleteEntranceExam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const exam = await EntranceExam.findByIdAndDelete(id);
    if (!exam) {
      res.status(404).json({
        message: "Entrance exam not found",
      });
      return;
    }

    res.status(200).json({
      message: "Entrance exam deleted successfully",
    });
    return;
  } catch (error) {
    console.error("Error deleting entrance exam:", error);
    res.status(500).json({
      message: "Something went wrong while deleting entrance exam",
      error,
    });
    return;
  }
};

/**
 * Update the display order of multiple exams
 * POST /entrance-exam/reorder
 * Body: { examOrders: [{ examId: string, displayOrder: number }] }
 */
export const updateExamOrder = async (req: Request, res: Response) => {
  try {
    const { examOrders } = req.body;

    if (!Array.isArray(examOrders)) {
      res.status(400).json({
        message: "examOrders must be an array",
      });
      return;
    }

    // Update each exam's displayOrder
    const updatePromises = examOrders.map(
      async (item: { examId: string; displayOrder: number }) => {
        if (!item.examId || typeof item.displayOrder !== "number") {
          throw new Error("Invalid examOrder item");
        }
        return EntranceExam.findByIdAndUpdate(item.examId, {
          displayOrder: item.displayOrder,
        });
      },
    );

    await Promise.all(updatePromises);

    res.status(200).json({
      message: "Exam order updated successfully",
    });
    return;
  } catch (error: any) {
    console.error("Error updating exam order:", error);
    res.status(500).json({
      message: "Something went wrong while updating exam order",
      error: error.message,
    });
    return;
  }
};
