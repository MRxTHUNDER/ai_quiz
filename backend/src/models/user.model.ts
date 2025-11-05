import { model, Schema } from "mongoose";
import { UserRole } from "../types/types";

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      trim: true,
      minLength: 4,
    },

    firstname: {
      type: String,
      required: true,
      trim: true,
      minLength: 2,
      maxLength: 100,
    },

    lastname: {
      type: String,
      trim: true,
      maxLength: 100,
    },

    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1 }); // Query users by role
userSchema.index({ createdAt: -1 }); // Get newest users first

export const User = model("User", userSchema);
