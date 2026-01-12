// user.helpers.js
import Usermodel from "../../../DB/models/User.model.js";

export const validateUser = async (customerId) => {
  const user = await Usermodel.findById(customerId);
  if (!user) {
    throw new Error("User not found", { cause: 401 });
  }
  return user;
};

export const validateShippingAddress = (user, shippingAddressId) => {
  if (!shippingAddressId) {
    throw new Error("Shipping address required", { cause: 400 });
  }
  const shippingAddress = user.Addresses.id(shippingAddressId);
  if (!shippingAddress) {
    throw new Error("Shipping address not found", { cause: 400 });
  }
  return shippingAddress;
};

export const validatePaymentMethod = (paymentMethod) => {
  const validMethods = ["My Ko Kart", "credit_card"];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    throw new Error("Invalid payment method", { cause: 400 });
  }
};