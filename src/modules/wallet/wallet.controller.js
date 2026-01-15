import * as walletServices from "./services/wallet.service.js";
import { getWalletValidation } from "./wallet.validation.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import { Router } from "express";

const router = Router();

router.get(
  "/",
  authentication(),
  validation(getWalletValidation),
  walletServices.getWallet
);

export default router;