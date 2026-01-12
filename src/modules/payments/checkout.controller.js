import express from "express";
import { checkout } from "./services/checkout.service.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";

const router = express.Router();

router.post(
  "/checkout",
  authentication(),        
  checkout                
);

export default router;