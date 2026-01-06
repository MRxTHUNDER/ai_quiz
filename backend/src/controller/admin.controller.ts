import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/user.model";
import { generateAdminToken } from "../utils/jwt";
import { UserRole } from "../types/types";
import { adminSignupBody, adminSigninBody } from "../zod/userValidation";
import {
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getAllTestAttempts,
  getTestAttemptDetails,
  getUserProgressForAdmin,
  getPlatformStatistics,
} from "../service/adminManagement.service";

export const AdminSignup = async (req: Request, res: Response) => {
  const { success, error, data } = adminSignupBody.safeParse(req.body);

  if (!success) {
    res.status(400).json({
      message: "Invalid Input",
      error: error,
    });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({
      message: "Admin password not configured",
    });
    return;
  }

  if (data.adminPassword !== adminPassword) {
    res.status(403).json({
      message: "Invalid admin password",
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

  const { password, email, firstName, lastName } = data;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const user = await User.create({
      email,
      password: hashedPassword,
      firstname: firstName,
      lastname: lastName || "",
      role: UserRole.ADMIN,
    });

    const userId = user._id.toString();

    const token = generateAdminToken(userId);

    // Clear userToken if present to avoid conflicts
    res.clearCookie("userToken");

    res.cookie("adminToken", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      secure: process.env.NODE_ENV === "production",
      domain:
        process.env.NODE_ENV === "production"
          ? process.env.COOKIE_DOMAIN
          : undefined,
    });

    res.status(200).json({
      message: "Admin created successfully",
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
      message: "Error creating Admin",
      error: err.message || err,
    });
  }
};

export const AdminSignin = async (req: Request, res: Response) => {
  const { success, error, data } = adminSigninBody.safeParse(req.body);
  if (!success) {
    res.status(400).json({
      message: "Invalid input",
      error: error,
    });
    return;
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    res.status(500).json({
      message: "Admin password not configured",
    });
    return;
  }

  if (data.adminPassword !== adminPassword) {
    res.status(403).json({
      message: "Invalid admin password",
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

    if (user.role !== UserRole.ADMIN) {
      res.status(403).json({
        message: "Access denied. Admin privileges required.",
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

    const token = generateAdminToken(userId);

    // Clear userToken if present to avoid conflicts
    res.clearCookie("userToken");

    res.cookie("adminToken", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
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

export const AdminLogout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("adminToken");

    res.status(200).json({
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Error during logout",
    });
  }
};

/**
 * Get all users with pagination and filtering
 * GET /admin/users?page=1&limit=10&search=john&role=user&entranceExamId=xxx&startDate=2024-01-01&endDate=2024-12-31
 */
export const GetAllUsers = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const search = req.query.search as string;
    const role = req.query.role as string;
    const entranceExamId = req.query.entranceExamId as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const result = await getAllUsers(page, limit, search, role, entranceExamId, startDate, endDate);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error retrieving users:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get user details with statistics
 * GET /admin/users/:userId
 */
export const GetUserDetails = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await getUserDetails(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error retrieving user details:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Update user details
 * PUT /admin/users/:userId
 */
export const UpdateUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { email, firstname, lastname, role } = req.body;

    // Validate role if provided
    if (role && !Object.values(UserRole).includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const updateData: any = {};
    if (email) updateData.email = email;
    if (firstname) updateData.firstname = firstname;
    if (lastname !== undefined) updateData.lastname = lastname;
    if (role) updateData.role = role;

    const updatedUser = await updateUser(userId, updateData);

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully",
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
  } catch (error) {
    console.error("Error updating user:", error);
    if (error instanceof Error && error.message === "Email already exists") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "Error updating user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Delete user
 * DELETE /admin/users/:userId
 */
export const DeleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Prevent deleting own account
    if (req.userId === userId) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own account",
      });
    }

    const deletedUser = await deleteUser(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting user",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get all test attempts with filtering
 * GET /admin/test-attempts?page=1&limit=10&userId=XXX&testId=YYY&status=completed
 */
export const GetAllTestAttempts = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 10));
    const userId = req.query.userId as string;
    const testId = req.query.testId as string;
    const entranceExamId = req.query.entranceExamId as string;
    const status = req.query.status as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const filters: any = {};
    if (userId) filters.userId = userId;
    if (testId) filters.testId = testId;
    if (entranceExamId) filters.entranceExamId = entranceExamId;
    if (status) filters.status = status;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const result = await getAllTestAttempts(page, limit, filters);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error retrieving test attempts:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test attempts",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get test attempt details
 * GET /admin/test-attempts/:attemptId
 */
export const GetTestAttemptDetails = async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const result = await getTestAttemptDetails(attemptId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Test attempt not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error retrieving test attempt details:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving test attempt details",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get user progress for admin view
 * GET /admin/users/:userId/progress
 */
export const GetUserProgress = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await getUserProgressForAdmin(userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error retrieving user progress:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving user progress",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get platform statistics
 * GET /admin/statistics
 */
export const GetPlatformStatistics = async (req: Request, res: Response) => {
  try {
    const statistics = await getPlatformStatistics();

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error("Error retrieving platform statistics:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving platform statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
