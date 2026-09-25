import { Schema, model } from "mongoose";

const passwordResetOtpSchema = new Schema(
  {
    email: { type: String, required: true, index: true },
    role: { type: String, required: true, enum: ["user", "admin"] },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    attempts: { type: Number, default: 0 },
    usedAt: { type: Date },
  },
  { timestamps: true },
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetOtp = model("PasswordResetOtp", passwordResetOtpSchema);
