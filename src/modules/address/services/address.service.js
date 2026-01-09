import {asyncHandelr} from "../../../utlis/response/error.response.js";
import Usermodel from "../../../DB/models/User.model.js";
import mongoose from "mongoose";

const isVendor = (accountType) => {
  return accountType === 'vendor';
};

export const createAddress = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const accountType = req.user.accountType;
  
  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (isVendor(accountType) && user.Addresses.length >= 1) {
    return next(new Error("Vendor can only have one address", { cause: 400 }));
  }

  const newAddress = {
    ...req.body,
    _id: new mongoose.Types.ObjectId(),
  };

  if (user.Addresses.length === 0 || req.body.isDefault) {
    user.Addresses.forEach(addr => {
      addr.isDefault = false;
    });
    newAddress.isDefault = true;
  } else {
    newAddress.isDefault = false;
  }

  user.Addresses.push(newAddress);
  await user.save();

  return res.status(201).json({
    success: true,
    message: "Address created successfully",
    data: newAddress
  });
});

export const updateAddress = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { addressId, ...updateData } = req.body;

  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const addressIndex = user.Addresses.findIndex(
    addr => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    return next(new Error("Address not found", { cause: 404 }));
  }

  if (isVendor(user.accountType) && updateData.isDefault === false) {
    return next(new Error("Vendor must have one default address", { cause: 400 }));
  }

  if (updateData.isDefault === true) {
    user.Addresses.forEach(addr => {
      addr.isDefault = false;
    });
  }

  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      user.Addresses[addressIndex][key] = updateData[key];
    }
  });

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Address updated successfully",
    data: user.Addresses[addressIndex]
  });
});

export const deleteAddress = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { addressId } = req.body;

  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const addressIndex = user.Addresses.findIndex(
    addr => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    return next(new Error("Address not found", { cause: 404 }));
  }

  if (isVendor(user.accountType)) {
    if (user.Addresses[addressIndex].isDefault) {
      return next(new Error("Vendor cannot delete default address. Update it instead.", { cause: 400 }));
    }
  }

  if (user.Addresses.length === 1 && user.Addresses[addressIndex].isDefault) {
    return next(new Error("Cannot delete the last default address", { cause: 400 }));
  }

  user.Addresses.splice(addressIndex, 1);

  if (user.Addresses.length > 0 && !user.Addresses.find(addr => addr.isDefault)) {
    user.Addresses[0].isDefault = true;
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Address deleted successfully"
  });
});

export const getAllAddresses = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;

  const user = await Usermodel.findById(userId).select("Addresses accountType");
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  return res.status(200).json({
    success: true,
    count: user.Addresses.length,
    accountType: user.accountType,
    data: user.Addresses
  });
});

export const getAddressById = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { addressId } = req.params;

  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const address = user.Addresses.find(
    addr => addr._id.toString() === addressId
  );

  if (!address) {
    return next(new Error("Address not found", { cause: 404 }));
  }

  return res.status(200).json({
    success: true,
    data: address
  });
});

export const setDefaultAddress = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { addressId } = req.body;

  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const addressIndex = user.Addresses.findIndex(
    addr => addr._id.toString() === addressId
  );

  if (addressIndex === -1) {
    return next(new Error("Address not found", { cause: 404 }));
  }

  user.Addresses.forEach(addr => {
    addr.isDefault = false;
  });

  user.Addresses[addressIndex].isDefault = true;

  await user.save();

  return res.status(200).json({
    success: true,
    message: "Default address updated successfully",
    data: user.Addresses[addressIndex]
  });
});

export const getDefaultAddress = async (userId) => {
  const user = await Usermodel.findById(userId);
  if (!user) return null;
  
  return user.Addresses.find(addr => addr.isDefault) || user.Addresses[0] || null;
};

export const checkAddressLimit = async (userId, accountType) => {
  if (isVendor(accountType)) {
    const user = await Usermodel.findById(userId);
    if (user && user.Addresses.length >= 1) {
      return { allowed: false, message: "Vendor can only have one address" };
    }
  }
  return { allowed: true };
};