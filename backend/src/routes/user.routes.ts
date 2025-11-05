import express from "express";
import {
  Signin,
  Signup,
  Logout,
  UpdateProfile,
} from "../controller/user.controller";
import { AuthMiddleware } from "../middleware/middleware";

export const UserRouter = express.Router();

UserRouter.post("/signup", Signup);
UserRouter.post("/signin", Signin);
UserRouter.post("/logout", Logout);

UserRouter.get("/profile", AuthMiddleware({ allowAll: true }), (req, res) => {
  res.json({
    message: "Profile data",
    data: {
      user: req.user,
    },
  });
});

UserRouter.put("/me", AuthMiddleware({ allowAll: true }), UpdateProfile);
