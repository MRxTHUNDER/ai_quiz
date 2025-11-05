import z from "zod";
import { UserRole } from "../types/types";

// Validation schemas
export const signupBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().optional(),
});

export const adminSignupBody = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(2),
  lastName: z.string().optional(),
  adminPassword: z.string().min(1),
});

export const signinBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const adminSigninBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  adminPassword: z.string().min(1),
});

export const updateProfileBody = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const adminUpdateUserBody = z.object({
  email: z.string().email().optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().optional(),
  password: z.string().min(6).optional(),
  role: z.nativeEnum(UserRole).optional(),
});
