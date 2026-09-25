import crypto from "crypto";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { Request, Response } from "express";
import { User } from "../models/user.model";
import { PasswordResetOtp } from "../models/passwordResetOtp.model";
import { UserRole } from "../types/types";

const otpTransporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const hashOtp = (otp: string) => crypto.createHash("sha256").update(otp).digest("hex");
const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  return `${name?.slice(0, 2) || ""}***@${domain || "unknown"}`;
};

export const PasswordReset = async (req: Request, res: Response) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const role = req.body.role === "admin" ? UserRole.ADMIN : UserRole.USER;
  const otp = req.body.otp ? String(req.body.otp).trim() : "";
  const newPassword = req.body.newPassword ? String(req.body.newPassword) : "";

  console.log("[password-reset] request", {
    email: maskEmail(email),
    role,
    step: otp || newPassword ? "verify" : "send-otp",
  });

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: "Enter a valid email address" });
  }

  const user = await User.findOne({ email, role });
  console.log("[password-reset] account lookup", {
    email: maskEmail(email),
    role,
    exists: Boolean(user),
  });

  // First call: validate the email and send an OTP only for an existing account.
  if (!otp && !newPassword) {
    if (!user) {
      return res.status(404).json({ exists: false, message: "Email does not exist" });
    }

    const code = crypto.randomInt(100000, 1000000).toString();
    await PasswordResetOtp.deleteMany({ email, role });
    await PasswordResetOtp.create({
      email,
      role,
      otpHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    console.log("[password-reset] OTP stored", { email: maskEmail(email), role });

    try {
      await otpTransporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Your password reset OTP",
        text: `Your password reset OTP is ${code}. It expires in 10 minutes.`,
      });
      console.log("[password-reset] OTP email sent", { email: maskEmail(email), role });
    } catch (error) {
      await PasswordResetOtp.deleteMany({ email, role });
      console.error("[password-reset] OTP email failed", {
        email: maskEmail(email),
        role,
        error,
      });
      return res.status(500).json({ message: "Unable to send OTP right now" });
    }

    return res.status(200).json({ exists: true, otpSent: true, message: "OTP sent to your email" });
  }

  if (!otp || newPassword.length < 6) {
    return res.status(400).json({ message: "OTP and a password of at least 6 characters are required" });
  }
  if (!user) {
    return res.status(404).json({ message: "Email does not exist" });
  }

  const reset = await PasswordResetOtp.findOne({ email, role, usedAt: { $exists: false } }).sort({ createdAt: -1 });
  if (!reset || reset.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ message: "OTP expired or not requested" });
  }
  if (reset.attempts >= 5 || reset.otpHash !== hashOtp(otp)) {
    reset.attempts += 1;
    await reset.save();
    console.warn("[password-reset] invalid OTP", {
      email: maskEmail(email),
      role,
      attempts: reset.attempts,
    });
    return res.status(400).json({ message: "Invalid OTP" });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  reset.usedAt = new Date();
  await reset.save();
  console.log("[password-reset] password updated", { email: maskEmail(email), role });
  return res.status(200).json({ message: "Password reset successfully" });
};
