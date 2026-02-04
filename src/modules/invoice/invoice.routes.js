import express from "express";
import {
    authentication,
    authorization,
  } from "../../middlewere/authontcation.middlewere.js";
import {
  createInvoice,
  getInvoiceById,
  updateInvoiceById,
  deleteInvoiceById,
} from "./invoice.controller.js";
// import { protect } from "../auth/auth.middleware.js";

const router = express.Router();

// router.use(protect);

router.post("/", authentication() , createInvoice);
router.get("/:id",authentication() , getInvoiceById);
router.put("/:id", authentication() , updateInvoiceById);
router.delete("/:id", authentication()  ,deleteInvoiceById);

export default router;
