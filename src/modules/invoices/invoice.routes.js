import { Router } from "express";
import * as invoiceController from "./invoice.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import {
  getAllPaidInvoicesSchema,
  getInvoiceByIdSchema,
} from "./invoice.validation.js";

const router = Router();


router.get(
  "/",
  authentication(),
  validation(getAllPaidInvoicesSchema),
  invoiceController.getAllPaidOrders
);

router.get(
  "/:orderId",
  authentication(),
  validation(getInvoiceByIdSchema, "params"),
  invoiceController.getOrderInvoiceById
);

export default router;
