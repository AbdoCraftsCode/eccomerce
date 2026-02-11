import { Router } from "express";
import * as ordersController from "./orders.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";
import { getUserOrdersSchema } from "./orders.validation.js";

const router = Router();

router.get(
  "/",
  authentication(),
  validation(getUserOrdersSchema),
  ordersController.getUserOrders
);

export default router;
