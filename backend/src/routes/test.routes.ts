import express from "express";
import { CreateTest, GetAllTest, GetTest } from "../controller/test.controller";

export const TestRouter = express.Router();

TestRouter.post("/create", CreateTest);
TestRouter.get("/", GetAllTest);
TestRouter.get("/:id", GetTest);
