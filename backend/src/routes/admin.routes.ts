import express from "express";
import { AdminSignup, AdminSignin, AdminLogout } from "../controller/admin.controller";
import { AuthMiddleware } from "../middleware/middleware";
import { UserRole } from "../types/types";

export const AdminRouter = express.Router();

AdminRouter.post("/signup", AdminSignup);
AdminRouter.post("/signin", AdminSignin);
AdminRouter.post("/logout", AdminLogout);

AdminRouter.get("/profile", AuthMiddleware({ requiredRoles: [UserRole.ADMIN] }), (req, res) => {
  res.json({
    message: "Profile data",
    data: {
      user: req.user,
    },
  });
});
