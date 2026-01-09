import { Router } from "express";
import { authentication, authorization } from "../../middlewere/authontcation.middlewere.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import { endpoint } from "./address.authrize.js";
import * as addressValidators from "./address.validation.js";
import * as addressServices from "./services/address.service.js";

const router = Router();

router.post(
  "/create",
  authentication(),
//   authorization(endpoint.create),
  validation(addressValidators.createAddressValidation),
  addressServices.createAddress
);

router.put(
  "/update",
  authentication(),
//   authorization(endpoint.update),
  validation(addressValidators.updateAddressValidation),
  addressServices.updateAddress
);

router.delete(
  "/delete",
  authentication(),
//   authorization(endpoint.delete),
  validation(addressValidators.deleteAddressValidation),
  addressServices.deleteAddress
);

router.get(
  "/getAll",
  authentication(),
//   authorization(endpoint.getAll),
  addressServices.getAllAddresses
);

router.get(
  "/get/:addressId",
  authentication(),
//   authorization(endpoint.getSingle),
  validation(addressValidators.getAddressValidation),
  addressServices.getAddressById
);

router.patch(
  "/setDefault",
  authentication(),
//   authorization(endpoint.setDefault),
  validation(addressValidators.setDefaultAddressValidation),
  addressServices.setDefaultAddress
);

export default router;