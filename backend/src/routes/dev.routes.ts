import express from "express";
import { ClearDatabase } from "../controller/dev.controller";

export const DevRouter = express.Router();

DevRouter.delete("/clear-db", ClearDatabase);
