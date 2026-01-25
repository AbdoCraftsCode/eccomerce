import express from "express";
import { getDashboardStats } from "./admin.controller.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";


const router = express.Router();

router.get("/homePage",authentication() , getDashboardStats);

export default router;
