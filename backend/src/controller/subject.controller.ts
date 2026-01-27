import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";

export const GetAllSubjects = async (req: Request, res: Response) => {
  try {
    const includeDisabled =
      typeof req.query.includeDisabled === "string"
        ? req.query.includeDisabled === "true"
        : false;

    const query = includeDisabled ? {} : { isEnabled: true };

    const subjects = await Subject.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      message: "Subjects retrieved successfully",
      subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      message: "Something went wrong while fetching subjects",
      error,
    });
  }
};

export const CreateSubject = async (req: Request, res: Response) => {
  try {
    const { subjectName, testDuration, entraceExamId, isEnabled } = req.body;

    if (!subjectName || !testDuration || !entraceExamId) {
      res.status(400).json({
        message: "subjectName, testDuration and entraceExamId is required",
      });
      return;
    }

    const entraceExam = await EntranceExam.findById(entraceExamId);
    if (!entraceExam) {
      res.status(400).json({
        message: "Entrace exam not found",
      });
      return;
    }

    const existingSubject = await Subject.findOne({
      subjectName,
    });

    if (existingSubject) {
      res.status(400).json({
        message: "Subject with this name already exists",
      });
      return;
    }

    const subject = await Subject.create({
      subjectName,
      testDuration,
      isEnabled: typeof isEnabled === "boolean" ? isEnabled : true,
    });

    // For backward compatibility with exams that store subject ObjectIds only,
    // push the subject reference. Newer code primarily manages subjects via
    // the EntranceExam controller.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (entraceExam as any)?.subjects.push(subject._id);
    await entraceExam?.save();

    res.status(201).json({
      message: "Subject created successfully",
      subject,
      entraceExam: {
        id: entraceExam?._id,
        name: entraceExam?.entranceExamName,
      },
    });
    return;
  } catch (error) {
    console.error("Error creating Subject:", error);
    res.status(500).json({
      message: "Something went wrong while creating Subject",
      error: error,
    });
    return;
  }
};

export const UpdateSubject = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isEnabled } = req.body;

    const subject = await Subject.findById(id);

    if (!subject) {
      res.status(404).json({
        message: "Subject not found",
      });
      return;
    }

    if (typeof isEnabled === "boolean") {
      subject.isEnabled = isEnabled;
    }

    await subject.save();

    res.status(200).json({
      message: "Subject updated successfully",
      subject,
    });
    return;
  } catch (error) {
    console.error("Error updating Subject:", error);
    res.status(500).json({
      message: "Something went wrong while updating Subject",
      error: error,
    });
    return;
  }
};
