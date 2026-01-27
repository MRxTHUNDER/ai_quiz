import { Request, Response } from "express";
import { UIFlags } from "../models/uiFlags.model";
import { UserRole } from "../types/types";

/**
 * Get UI flags
 * GET /ui-flags
 * Public endpoint - can be accessed by anyone (needed for frontend checks)
 */
export const getUIFlags = async (req: Request, res: Response) => {
  try {
    let flags = await UIFlags.findOne();
    
    // If no flags exist, create default ones
    if (!flags) {
      flags = await UIFlags.create({});
    }

    res.status(200).json({
      success: true,
      data: {
        questionsPageEnabled: flags.questionsPageEnabled,
        featuredExamNames: flags.featuredExamNames,
      },
    });
  } catch (error) {
    console.error("Error fetching UI flags:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching UI flags",
    });
  }
};

/**
 * Update UI flags
 * PUT /ui-flags
 * Admin only
 */
export const updateUIFlags = async (req: Request, res: Response) => {
  try {
    const currentUserRole = req.user?.role;

    // Check if user is admin
    if (currentUserRole !== UserRole.ADMIN) {
      res.status(403).json({
        success: false,
        message: "Only admins can update UI flags",
      });
      return;
    }

    const { questionsPageEnabled, featuredExamNames } = req.body;

    // Get or create flags document
    let flags = await UIFlags.findOne();
    if (!flags) {
      flags = await UIFlags.create({});
    }

    // Update feature flags
    if (typeof questionsPageEnabled === "boolean") {
      flags.questionsPageEnabled = questionsPageEnabled;
    }

    // Update featured exam names (expecting an array of strings, max 4)
    if (
      Array.isArray(featuredExamNames) &&
      featuredExamNames.every((name) => typeof name === "string")
    ) {
      // Normalize: trim, remove empties, limit to 4
      const cleaned = featuredExamNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .slice(0, 4);

      if (cleaned.length > 0) {
        flags.featuredExamNames = cleaned;
      }
    }

    await flags.save();

    res.status(200).json({
      success: true,
      message: "UI flags updated successfully",
      data: {
        questionsPageEnabled: flags.questionsPageEnabled,
        featuredExamNames: flags.featuredExamNames,
      },
    });
  } catch (error) {
    console.error("Error updating UI flags:", error);
    res.status(500).json({
      success: false,
      message: "Error updating UI flags",
    });
  }
};
