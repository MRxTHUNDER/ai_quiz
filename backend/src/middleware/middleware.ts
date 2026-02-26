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

/**
 * Admin Authentication Middleware
 * ONLY accepts adminToken, rejects userToken
 * Verifies that the user has ADMIN role
 */
export const adminAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const adminToken = req.cookies.adminToken;
    const userToken = req.cookies.userToken;


    // Reject if adminToken is not present
    if (!adminToken) {
      console.error("[adminAuthMiddleware] Admin token required but not found");
      return res.status(401).json({
        message: "Admin authentication required",
        code: "NO_ADMIN_TOKEN",
      });
    }

    // Warn if userToken is present (shouldn't be used for admin routes)
    if (userToken) {
      console.warn(
        "[adminAuthMiddleware] User token present but ignored for admin route"
      );
    }

    // Verify admin token
    let decoded;
    try {
      decoded = verifyAdminToken(adminToken);
    } catch (tokenError) {
      if (isTokenExpired(tokenError)) {
        return res.status(401).json({
          message: "Admin token expired",
          code: "TOKEN_EXPIRED",
        });
      }
      if (isInvalidToken(tokenError)) {
        return res.status(401).json({
          message: "Invalid admin token",
          code: "INVALID_TOKEN",
        });
      }
      throw tokenError;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error(
        "[adminAuthMiddleware] User not found for userId:",
        decoded.userId
      );
      return res.status(404).json({ message: "User not found" });
    }

    // Verify user is actually an admin
    if (user.role !== UserRole.ADMIN) {
      console.error(
        "[adminAuthMiddleware] User is not an admin:",
        user.email,
        "Role:",
        user.role
      );
      return res.status(403).json({
        message: "Admin privileges required",
        code: "NOT_ADMIN",
      });
    }

    // Set user info on request
    req.userId = user._id.toString();
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstname: user.firstname,
      role: user.role as UserRole,
    };

    next();
  } catch (err) {
    console.error("[adminAuthMiddleware] Authentication error:", err);

    if (isTokenExpired(err)) {
      return res.status(401).json({
        message: "Admin token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    if (isInvalidToken(err)) {
      return res.status(401).json({
        message: "Invalid admin token",
        code: "INVALID_TOKEN",
      });
    }

    return res.status(500).json({
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};

/**
 * User Authentication Middleware
 * ONLY accepts userToken, rejects adminToken
 * Rejects admin users (they must use admin portal)
 */
export const userAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userToken = req.cookies.userToken;
    const adminToken = req.cookies.adminToken;

    // Reject if userToken is not present
    if (!userToken) {
      console.error("[userAuthMiddleware] User token required but not found");
      return res.status(401).json({
        message: "User authentication required",
        code: "NO_USER_TOKEN",
      });
    }

    // Warn if adminToken is present (shouldn't be used for user routes)
    if (adminToken) {
      console.warn(
        "[userAuthMiddleware] Admin token present but ignored for user route"
      );
    }

    // Verify user token
    let decoded;
    try {
      decoded = verifyUserToken(userToken);
    } catch (tokenError) {
      if (isTokenExpired(tokenError)) {
        return res.status(401).json({
          message: "User token expired",
          code: "TOKEN_EXPIRED",
        });
      }
      if (isInvalidToken(tokenError)) {
        return res.status(401).json({
          message: "Invalid user token",
          code: "INVALID_TOKEN",
        });
      }
      throw tokenError;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      console.error(
        "[userAuthMiddleware] User not found for userId:",
        decoded.userId
      );
      return res.status(404).json({ message: "User not found" });
    }

    // Reject admin users from using user routes
    if (user.role === UserRole.ADMIN) {
      console.error(
        "[userAuthMiddleware] Admin user attempted to use user route:",
        user.email
      );
      return res.status(403).json({
        message: "Admin users must use the admin portal",
        code: "ADMIN_USE_ADMIN_PORTAL",
      });
    }

    // Set user info on request
    req.userId = user._id.toString();
    req.user = {
      id: user._id.toString(),
      email: user.email,
      firstname: user.firstname,
      role: user.role as UserRole,
    };

    console.log("[userAuthMiddleware] User authenticated:", user.email);
    next();
  } catch (err) {
    console.error("[userAuthMiddleware] Authentication error:", err);

    if (isTokenExpired(err)) {
      return res.status(401).json({
        message: "User token expired",
        code: "TOKEN_EXPIRED",
      });
    }

    if (isInvalidToken(err)) {
      return res.status(401).json({
        message: "Invalid user token",
        code: "INVALID_TOKEN",
      });
    }

    return res.status(500).json({
      message: "Authentication failed",
      code: "AUTH_ERROR",
    });
  }
};
