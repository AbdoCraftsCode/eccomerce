import express from "express";
import { getDashboardStats } from "./admin.controller.js";

const router = express.Router();

router.get("/homePage", getDashboardStats);

export default router;
