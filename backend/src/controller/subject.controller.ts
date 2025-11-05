import { Request, Response } from "express";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";

export const GetAllSubjects = async (req: Request, res: Response) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
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
    const { subjectName, testDuration, entraceExamId } = req.body;

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
    });

    entraceExam?.subjects.push(subject._id);
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
