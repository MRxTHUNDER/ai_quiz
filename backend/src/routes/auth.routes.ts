import express from "express";
import { PasswordReset } from "../controller/passwordReset.controller";

export const AuthRouter = express.Router();
AuthRouter.post("/password-reset", PasswordReset);
