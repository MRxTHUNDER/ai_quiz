import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { User } from "../models/user.model";
import { EntranceExam } from "../models/entranceExam.model";
import { UserRole } from "../types/types";
import { generateUserToken } from "../utils/jwt";
import {
  signinBody,
  signupBody,
  updateProfileBody,
} from "../zod/userValidation";
import {
  getUserProfileProgress,
  getUserProfileStats,
} from "../service/userProfile.service";

export const Signup = async (req: Request, res: Response) => {
  const { success, error, data } = signupBody.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Invalid Input",
      error: error,
    });
    return;
  }

  const existingUser = await User.findOne({
    email: data.email,
  });

  if (existingUser) {
    res.status(409).json({
      message: "Email already Exists",
    });
    return;
  }

  const { password, email, firstName, lastName, phoneNumber, entranceExamPreference } = data;

  // Validate entrance exam preference (required)
  const exam = await EntranceExam.findById(entranceExamPreference);
  if (!exam) {
    res.status(400).json({
      message: "Invalid entrance exam preference",
    });
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      email,
      password: hashedPassword,
      firstname: firstName,
      lastname: lastName || "",
      phoneNumber: phoneNumber.trim(),
      entranceExamPreference: entranceExamPreference,
      role: UserRole.USER,
    });

    const userId = user._id.toString();

    const token = generateUserToken(userId);

    res.cookie("userToken", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.COOKIE_DOMAIN
          : undefined,
    });

    res.status(200).json({
      message: "User created successfully",
      data: {
        user: {
          id: userId,
          email: user.email,
          firstname: user.firstname,
          role: user.role,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error creating User",
      error: err.message || err,
    });
  }
};

export const Signin = async (req: Request, res: Response) => {
  const { success, error, data } = signinBody.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      message: "Invalid input",
      error: error,
    });
    return;
  }

  const { email, password } = data;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    // Reject admin users from using normal login
    if (user.role === UserRole.ADMIN) {
      res.status(403).json({
        message: "Admin users must use the admin login portal",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({
        message: "Invalid email or password",
      });
      return;
    }

    const userId = user._id.toString();

    const token = generateUserToken(userId);

    res.cookie("userToken", token, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.COOKIE_DOMAIN
          : undefined,
    });

    res.status(200).json({
      message: "Logged in successfully",
      data: {
        user: {
          id: userId,
          email: user.email,
          firstname: user.firstname,
          role: user.role,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      message: "Error during signin",
      error: err,
    });
  }
};

export const Logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("userToken");

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error during logout",
    });
  }
};

export const UpdateProfile = async (req: Request, res: Response) => {
  try {
    const { success, error, data } = updateProfileBody.safeParse(req.body);

    if (!success) {
      return res.status(400).json({
        message: "Invalid Input",
        error: error,
      });
    }

    const userId = req.userId!;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (data.email && data.email !== user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }
    }

    const updateData: any = {};

    if (data.email) {
      updateData.email = data.email;
    }

    if (data.firstName) {
      updateData.firstname = data.firstName;
    }

    if (data.lastName !== undefined) {
      updateData.lastname = data.lastName;
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: "-password",
    });

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      data: {
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          firstname: updatedUser.firstname,
          lastname: updatedUser.lastname,
          role: updatedUser.role,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Error updating profile",
      error: err.message || err,
    });
  }
};

/**
 * Get user profile with comprehensive progress tracking and statistics
 * GET /user/profile/progress
 * Requires authentication
 */
export const GetUserProfileProgress = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;

    // Get user info
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get progress data from service
    const progress = await getUserProfileProgress(userId);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname || "",
          role: user.role,
        },
        progress,
      },
    });
  } catch (error) {
    console.error("Error retrieving user profile progress:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user profile progress",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get detailed statistics and analytics for user progress
 * GET /user/profile/stats?period=week|month|year|all
 * Requires authentication
 */
export const GetUserProfileStats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || "all";

    // Get stats data from service
    const stats = await getUserProfileStats(userId, period);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error retrieving user profile stats:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user profile stats",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
