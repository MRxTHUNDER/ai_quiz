import { Request, Response } from "express";
import { EntranceExam } from "../models/entranceExam.model";
import { Subject } from "../models/subject.model";

export const GetAllEntranceExams = async (req: Request, res: Response) => {
  try {
    const exams = await EntranceExam.find()
      .populate({
        path: "subjects.subject",
        select: "subjectName testDuration",
      })
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: "Entrance exams retrieved successfully",
      exams,
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
    const exam = await EntranceExam.findById(id).populate({
      path: "subjects.subject",
      select: "subjectName testDuration",
    });

    if (!exam) {
      res.status(404).json({
        message: "Entrance exam not found",
      });
      return;
    }

    res.status(200).json({
      message: "Entrance exam retrieved successfully",
      exam,
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
    const { entranceExamName, entranceExamId, durationMinutes, subjects, notes } = req.body;

    if (!entranceExamName || !entranceExamId || !durationMinutes) {
      res.status(400).json({
        message: "entranceExamName, entranceExamId, and durationMinutes are required",
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
    const processedSubjects = [];
    if (subjects && Array.isArray(subjects)) {
      for (const sub of subjects) {
        if (!sub.subjectName || !sub.durationMinutes) {
          res.status(400).json({
            message: "Each subject must have subjectName and durationMinutes",
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
        });
      }
    }

    const exam = await EntranceExam.create({
      entranceExamName,
      entranceExamId,
      durationMinutes,
      subjects: processedSubjects,
      notes: notes || "",
    });

    const populatedExam = await EntranceExam.findById(exam._id).populate({
      path: "subjects.subject",
      select: "subjectName testDuration",
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
    const { entranceExamName, entranceExamId, durationMinutes, subjects, notes } = req.body;

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

    // Update subjects if provided
    if (subjects && Array.isArray(subjects)) {
      const processedSubjects = [];
      for (const sub of subjects) {
        if (!sub.subjectName || !sub.durationMinutes) {
          res.status(400).json({
            message: "Each subject must have subjectName and durationMinutes",
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
      select: "subjectName testDuration",
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
