import { NextFunction, Request, Response } from "express";
import { User } from "../models/user.model";
import {
  verifyUserToken,
  verifyAdminToken,
  isTokenExpired,
  isInvalidToken,
} from "../utils/jwt";
import { UserRole } from "../types/types";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      user?: {
        id: string;
        email: string;
        firstname: string;
        role: UserRole;
      };
    }
  }
}

interface AuthMiddlewareOptions {
  requiredRoles?: UserRole[];
  allowAll?: boolean;
}

export const AuthMiddleware = (options: AuthMiddlewareOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userToken = req.cookies.userToken;
      const adminToken = req.cookies.adminToken;

      if (!userToken && !adminToken) {
        return res.status(401).json({
          message: "Token required",
          code: "NO_TOKEN",
        });
      }

      let decoded;
      if (userToken) {
        decoded = verifyUserToken(userToken);
      } else if (adminToken) {
        decoded = verifyAdminToken(adminToken);
      } else {
        return res.status(401).json({
          message: "Token required",
          code: "NO_TOKEN",
        });
      }

      const user = await User.findById(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!options.allowAll && options.requiredRoles) {
        if (!options.requiredRoles.includes(user.role as UserRole)) {
          return res.status(403).json({
            message: "Insufficient permissions",
            required: options.requiredRoles,
            current: user.role,
          });
        }
      }

      req.userId = user._id.toString();

      req.user = {
        id: user._id.toString(),
        email: user.email,
        firstname: user.firstname,
        role: user.role as UserRole,
      };

      next();
    } catch (err) {
      console.error("Authentication error:", err);

      if (isTokenExpired(err)) {
        return res.status(401).json({
          message: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      }

      if (isInvalidToken(err)) {
        return res.status(401).json({
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }

      return res.status(500).json({
        message: "Authentication failed",
        code: "AUTH_ERROR",
      });
    }
  };
};
