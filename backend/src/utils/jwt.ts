import jwt from "jsonwebtoken";
import { ADMIN_JWT_SECRET, USER_JWT_SECRET } from "../env";


interface TokenPayload {
  userId: string;
}

export const generateUserToken = (userId: string): string => {
  return jwt.sign({ userId }, USER_JWT_SECRET, { expiresIn: "7d" });
};

export const generateAdminToken = (userId: string): string => {
  return jwt.sign({ userId }, ADMIN_JWT_SECRET, { expiresIn: "7d" });
};

export const verifyUserToken = (token: string): TokenPayload => {
  return jwt.verify(token, USER_JWT_SECRET) as TokenPayload;
};

export const verifyAdminToken = (token: string): TokenPayload => {
  return jwt.verify(token, ADMIN_JWT_SECRET) as TokenPayload;
};

export const isTokenExpired = (error: any): boolean => {
  return error instanceof jwt.TokenExpiredError;
};

export const isInvalidToken = (error: any): boolean => {
  return error instanceof jwt.JsonWebTokenError;
};
