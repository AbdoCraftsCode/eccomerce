import express from "express";
import { checkout , a7a} from "./services/checkout.service.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";

const router = express.Router();

router.post(
  "/asdfaadfasdfasdfasd",
  authentication(),
  a7a
)

router.post(
  "/checkout",
  authentication(),        
  checkout                
);



export default router;