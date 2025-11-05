import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { User } from "../models/user.model";
import { generateAdminToken } from "../utils/jwt";
import { UserRole } from "../types/types";
import { adminSignupBody, adminSigninBody } from "../zod/userValidation";

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

    res.cookie("adminToken", token, {
      httpOnly: true,
      sameSite: "strict",
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

    res.cookie("adminToken", token, {
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
