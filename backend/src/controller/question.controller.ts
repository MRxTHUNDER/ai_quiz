import { Request, Response } from "express";
import mongoose from "mongoose";
import { GenerateAIQuestions } from "../service/generateQuestion";
import { QuestionModel } from "../models/questions.model";
import { Summary } from "../models/summary.model";
import { Subject } from "../models/subject.model";
import { EntranceExam } from "../models/entranceExam.model";
import { GenerateQuestionsFromSubjectKnowledge } from "../service/generateQuestionFromSubject";
import { UserRole } from "../types/types";

interface Questions {
  questionsText: string;
  Options: string[];
  correctOption: string;
  SubjectId: string;
}

export const CreateQuestions = async (req: Request, res: Response) => {
  try {
    const { fileUrl, subjectId, numQuestions } = req.body;

    if (!fileUrl || !subjectId) {
      res.status(400).json({
        message: "fileUrl and subjectId required",
      });
      return;
    }

    // Try to find existing summary for this subject
    let sourceForQuestions = fileUrl;
    let isUsingSummary = false;

    try {
      const summaries = await Summary.find({ subject: subjectId })
        .sort({ createdAt: -1 })
        .limit(5);

      if (summaries.length > 0) {
        // Use combined summaries for richer question generation
        sourceForQuestions = summaries
          .map((s) => s.summaryText)
          .join("\n\n---\n\n");
        isUsingSummary = true;
        console.log(
          `Using ${summaries.length} existing summaries for question generation`
        );
      }
    } catch (summaryError) {
      console.warn(
        "Could not fetch summaries, falling back to direct PDF:",
        summaryError
      );
    }

    let generatedQuestions: Questions[] = [];

    // Try summary-based generation first
    if (isUsingSummary) {
      try {
        console.log("Attempting question generation from summaries...");
        generatedQuestions = await GenerateAIQuestions(
          sourceForQuestions,
          numQuestions,
          subjectId,
          true
        );
        console.log(
          `Successfully generated ${
            generatedQuestions?.length || 0
          } questions from summaries`
        );
      } catch (summaryGenError) {
        console.error("Summary-based generation failed:", summaryGenError);
        generatedQuestions = [];
      }
    }

    // Fallback: Generate questions based on subject knowledge
    if (!generatedQuestions || generatedQuestions.length === 0) {
      try {
        // Get subject and entrance exam details
        const subject = await Subject.findById(subjectId);
        const entranceExam = subject
          ? await EntranceExam.findOne({
              subjects: { $elemMatch: { subject: subject._id } },
            })
          : null;

        if (subject) {
          console.log(
            `Generating questions from subject knowledge: ${subject.subjectName}...`
          );
          generatedQuestions = await GenerateQuestionsFromSubjectKnowledge(
            subject.subjectName,
            entranceExam?.entranceExamName || "General Exam",
            numQuestions
          );
          console.log(
            `Generated ${
              generatedQuestions?.length || 0
            } questions from subject knowledge`
          );
        } else {
          console.error("Subject not found, cannot generate questions");
        }
      } catch (fallbackError) {
        console.error("Subject-based fallback failed:", fallbackError);
      }
    }

    const userId = req.userId;
    const formattedQuestions = generatedQuestions.map((q: Questions) => ({
      questionsText: q.questionsText,
      Options: q.Options,
      correctOption: q.correctOption,
      SubjectId: subjectId,
      createdBy: userId || undefined,
    }));

    const savedQuestions = await QuestionModel.insertMany(formattedQuestions);

    res.status(201).json({
      message: "Questions generated and saved successfully",
      questions: savedQuestions,
    });
    return;
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to generate questions",
    });
  }
};

/**
 * Get questions created by a specific user/admin
 * GET /question/by-creator/:userId?page=1&limit=10
 * For users: can only see their own questions
 * For admins: can see any user's questions
 */
export const GetQuestionsByCreator = async (req: Request, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.user?.role;

    // If no targetUserId provided, use current user's ID
    const creatorId = targetUserId || currentUserId;

    if (!creatorId) {
      res.status(400).json({
        success: false,
        message: "User ID is required",
      });
      return;
    }

    // Users can only see their own questions, admins can see anyone's
    if (currentUserRole !== UserRole.ADMIN && creatorId !== currentUserId) {
      res.status(403).json({
        success: false,
        message: "You can only view your own questions",
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = 20; // Fixed limit of 20 questions per page
    const skip = (page - 1) * limit;

    // Get filter parameters
    const entranceExamId = req.query.entranceExamId as string | undefined;
    const subjectId = req.query.subjectId as string | undefined;

    // Build query filter
    const queryFilter: any = {
      createdBy: creatorId,
    };

    // If entranceExamId is provided, we need to filter by subjects in that exam
    let subjectObjectIds: mongoose.Types.ObjectId[] = [];
    if (entranceExamId) {
      const entranceExam = await EntranceExam.findOne({
        entranceExamId: entranceExamId,
      });

      if (entranceExam) {
        subjectObjectIds = (entranceExam.subjects as any[]).map(
          (sub) => sub.subject
        );
        if (subjectObjectIds.length === 0) {
          // No subjects found for this exam, return empty result
          return res.status(200).json({
            success: true,
            pagination: {
              currentPage: page,
              limit: limit,
              totalCount: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
            count: 0,
            data: [],
          });
        }
      } else {
        // Entrance exam not found, return empty result
        return res.status(200).json({
          success: true,
          pagination: {
            currentPage: page,
            limit: limit,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
          count: 0,
          data: [],
        });
      }
    }

    // Apply subject filter
    if (subjectId) {
      // Validate subjectId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(subjectId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID",
        });
      }

      // If entrance exam is also selected, verify subject belongs to that exam
      if (entranceExamId && subjectObjectIds.length > 0) {
        const subjectObjId = new mongoose.Types.ObjectId(subjectId);
        const subjectBelongsToExam = subjectObjectIds.some(
          (id) => id.toString() === subjectObjId.toString()
        );
        if (!subjectBelongsToExam) {
          // Subject doesn't belong to the selected entrance exam
          return res.status(200).json({
            success: true,
            pagination: {
              currentPage: page,
              limit: limit,
              totalCount: 0,
              totalPages: 0,
              hasNextPage: false,
              hasPrevPage: false,
            },
            count: 0,
            data: [],
          });
        }
      }
      queryFilter.SubjectId = new mongoose.Types.ObjectId(subjectId);
    } else if (entranceExamId && subjectObjectIds.length > 0) {
      // Only entrance exam selected, filter by all subjects in that exam
      queryFilter.SubjectId = { $in: subjectObjectIds };
    }

    // Count total matching questions
    const totalCount = await QuestionModel.countDocuments(queryFilter);

    // Fetch questions with filters
    const questions = await QuestionModel.find(queryFilter)
      .populate("SubjectId", "subjectName")
      .populate("createdBy", "email firstname lastname role")
      .select(
        "questionsText Options correctOption SubjectId createdBy createdAt updatedAt"
      )
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Get entrance exam info for each question's subject
    const formattedQuestions = await Promise.all(
      questions.map(async (question) => {
        let entranceExamInfo = null;

        if (question.SubjectId) {
          // Find the entrance exam that contains this subject
          const entranceExam = await EntranceExam.findOne({
            "subjects.subject": (question.SubjectId as any)._id,
          }).select("entranceExamName entranceExamId");

          if (entranceExam) {
            entranceExamInfo = {
              name: entranceExam.entranceExamName,
              id: entranceExam.entranceExamId,
            };
          }
        }

        return {
          id: question._id.toString(),
          questionsText: question.questionsText,
          Options: question.Options,
          correctOption: question.correctOption,
          subject: (question.SubjectId as any)?.subjectName || null,
          entranceExam: entranceExamInfo,
          createdBy: question.createdBy
            ? {
                id: (question.createdBy as any)._id?.toString(),
                email: (question.createdBy as any).email,
                name: `${(question.createdBy as any).firstname || ""} ${
                  (question.createdBy as any).lastname || ""
                }`.trim(),
                role: (question.createdBy as any).role,
              }
            : null,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      count: formattedQuestions.length,
      data: formattedQuestions,
    });
  } catch (error) {
    console.error("Error retrieving questions by creator:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving questions by creator",
    });
  }
};

export const GetSubjectQuestions = async (req: Request, res: Response) => {
  try {
    const { subjectId } = req.params;

    if (!subjectId) {
      res.status(400).json({
        success: false,
        message: "SubjectId is required",
      });
      return;
    }

    const subjectExists = await QuestionModel.findById(subjectId);

    if (!subjectExists) {
      res.status(400).json({
        success: false,
        message: "Subject not found",
      });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 10)
    );
    const skip = (page - 1) * limit;

    const totalCount = await QuestionModel.countDocuments({
      SubjectId: subjectId,
    });

    const questions = await QuestionModel.find({
      SubjectId: subjectId,
    })
      .select("questionsText Options correctOption")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const formattedQuestions = questions.map((question) => ({
      id: question._id.toString(),
      questionsText: question.questionsText,
      Options: question.Options,
      correctOption: question.correctOption, // Remove this for user-facing endpoints!
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    }));

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
      },
      count: formattedQuestions.length,
      data: formattedQuestions,
    });
  } catch (error) {
    console.error("Error retrieving questions:", error);

    res.status(500).json({
      success: false,
      message: "Error retrieving questions",
    });
  }
};

/**
 * Update a question
 * PUT /question/:questionId
 * Only admin or the question creator can update
 */
export const UpdateQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const { questionsText, Options, correctOption, SubjectId } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.user?.role;

    if (!questionId) {
      res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
      return;
    }

    // Validate required fields
    if (!questionsText || !Options || !correctOption) {
      res.status(400).json({
        success: false,
        message: "questionsText, Options, and correctOption are required",
      });
      return;
    }

    // Validate Options is an array with at least 2 items
    if (!Array.isArray(Options) || Options.length < 2) {
      res.status(400).json({
        success: false,
        message: "Options must be an array with at least 2 items",
      });
      return;
    }

    // Validate correctOption is one of the Options
    if (!Options.includes(correctOption)) {
      res.status(400).json({
        success: false,
        message: "correctOption must be one of the provided Options",
      });
      return;
    }

    // Find the question
    const question = await QuestionModel.findById(questionId);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    // Check authorization: only admin or question creator can update
    const questionCreatorId = question.createdBy?.toString();
    const isCreator = questionCreatorId === currentUserId;
    const isAdmin = currentUserRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator) {
      res.status(403).json({
        success: false,
        message: "You can only update questions you created",
      });
      return;
    }

    // Validate SubjectId if provided
    if (SubjectId) {
      if (!mongoose.Types.ObjectId.isValid(SubjectId)) {
        res.status(400).json({
          success: false,
          message: "Invalid SubjectId",
        });
        return;
      }

      const subjectExists = await Subject.findById(SubjectId);
      if (!subjectExists) {
        res.status(400).json({
          success: false,
          message: "Subject not found",
        });
        return;
      }
    }

    // Update the question
    const updateData: any = {
      questionsText,
      Options,
      correctOption,
    };

    if (SubjectId) {
      updateData.SubjectId = new mongoose.Types.ObjectId(SubjectId);
    }

    const updatedQuestion = await QuestionModel.findByIdAndUpdate(
      questionId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("SubjectId", "subjectName")
      .populate("createdBy", "email firstname lastname role");

    if (!updatedQuestion) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    // Get entrance exam info
    let entranceExamInfo = null;
    if (updatedQuestion.SubjectId) {
      const entranceExam = await EntranceExam.findOne({
        "subjects.subject": (updatedQuestion.SubjectId as any)._id,
      }).select("entranceExamName entranceExamId");

      if (entranceExam) {
        entranceExamInfo = {
          name: entranceExam.entranceExamName,
          id: entranceExam.entranceExamId,
        };
      }
    }

    res.status(200).json({
      success: true,
      message: "Question updated successfully",
      data: {
        id: updatedQuestion._id.toString(),
        questionsText: updatedQuestion.questionsText,
        Options: updatedQuestion.Options,
        correctOption: updatedQuestion.correctOption,
        subject: (updatedQuestion.SubjectId as any)?.subjectName || null,
        entranceExam: entranceExamInfo,
        createdBy: updatedQuestion.createdBy
          ? {
              id: (updatedQuestion.createdBy as any)._id?.toString(),
              email: (updatedQuestion.createdBy as any).email,
              name: `${(updatedQuestion.createdBy as any).firstname || ""} ${
                (updatedQuestion.createdBy as any).lastname || ""
              }`.trim(),
              role: (updatedQuestion.createdBy as any).role,
            }
          : null,
        createdAt: updatedQuestion.createdAt,
        updatedAt: updatedQuestion.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Error updating question",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete a question
 * DELETE /question/:questionId
 * Only admin or the question creator can delete
 */
export const DeleteQuestion = async (req: Request, res: Response) => {
  try {
    const { questionId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.user?.role;

    if (!questionId) {
      res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
      return;
    }

    // Find the question
    const question = await QuestionModel.findById(questionId);

    if (!question) {
      res.status(404).json({
        success: false,
        message: "Question not found",
      });
      return;
    }

    // Check authorization: only admin or question creator can delete
    const questionCreatorId = question.createdBy?.toString();
    const isCreator = questionCreatorId === currentUserId;
    const isAdmin = currentUserRole === UserRole.ADMIN;

    if (!isAdmin && !isCreator) {
      res.status(403).json({
        success: false,
        message: "You can only delete questions you created",
      });
      return;
    }

    // Delete the question
    await QuestionModel.findByIdAndDelete(questionId);

    res.status(200).json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting question",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
