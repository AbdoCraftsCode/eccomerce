import { Router } from "express";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as contactUsValidators from "./contactUs.validation.js";
import * as contactUsService from "./services/contactUs.service.js";

const router = Router();

router.get(
  "/",
  authentication(),
  //   authorization(endpoint.get),
  contactUsValidators.getAllChatsForAdminValidation,
  contactUsService.getAllChatsForAdmin,
);

router.get(
  "/getChatBYId",
  authentication(),
  contactUsValidators.getChatByIdValidation,
  contactUsService.getChatById,
);

export default router;
