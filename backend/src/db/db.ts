import mongoose from "mongoose";
import { DbConnection } from "../env";


if (!DbConnection) {
  throw new Error("MongoDB connection string is not defined");
}

export async function ConnectToDb() {
  try {
    await mongoose.connect(DbConnection);
    console.log("Connected to DB");
  } catch (err) {
    console.error("database connection error", err);
  }
}
