// vendor.helpers.js
import Usermodel from "../../../DB/models/User.model.js";

export const getVendors = async (products) => {
  const vendorIds = [...new Set(products.map((p) => p.createdBy.toString()))];
  const vendors = await Usermodel.find({
    _id: { $in: vendorIds },
    accountType: "vendor",
  }).select("_id fullName companyName Addresses");
  return { vendors, vendorIds };
};

export const createVendorsMap = (vendors) => {
  const vendorsMap = {};
  vendors.forEach((v) => (vendorsMap[v._id.toString()] = v));
  return vendorsMap;
};

export const validateVendors = (products, vendorsMap) => {
  for (const product of products) {
    const vendorId = product.createdBy.toString();
    const vendor = vendorsMap[vendorId];
    if (!vendor || !vendor.Addresses || vendor.Addresses.length === 0) {
      throw new Error(
        `Vendor issue for product "${product.name.en || product.name.ar || product.name}". Remove from cart`,
        { cause: 400 }
      );
    }
  }
};

export const getVendorAddressesMap = (vendorIds, vendorsMap) => {
  const vendorAddressesMap = {};
  for (const vendorId of vendorIds) {
    const vendor = vendorsMap[vendorId];
    const vendorAddress = vendor.Addresses[0];
    if (!vendorAddress) {
      throw new Error(
        `No address for vendor "${vendor.companyName || vendor.fullName}". Remove products`,
        { cause: 400 }
      );
    }
    vendorAddressesMap[vendorId] = {
      addressName: vendorAddress.addressName,
      addressDetails: vendorAddress.addressDetails,
      latitude: vendorAddress.latitude,
      longitude: vendorAddress.longitude,
    };
  }
  return vendorAddressesMap;
};