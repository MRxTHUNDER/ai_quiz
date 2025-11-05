import jwt from "jsonwebtoken";

const USER_JWT_SECRET = process.env.USER_JWT_SECRET || "user_secret_key";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "admin_secret_key";

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
