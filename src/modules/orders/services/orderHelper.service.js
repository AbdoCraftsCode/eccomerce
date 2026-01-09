import mongoose from "mongoose";
import { ProductModellll } from "../../../../src/DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../../src/DB/models/variantSchema.js";
import Usermodel from "../../../../src/DB/models/User.model.js";

export const getProductById = async (productId) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product ID");
  }

  const product = await ProductModellll.findById(productId).select(
    "name mainPrice disCountPrice stock unlimitedStock createdBy images categories"
  );

  if (!product) {
    throw new Error(`Product not found: ${productId}`);
  }

  return product;
};

export const getVariantById = async (variantId) => {
  if (!mongoose.Types.ObjectId.isValid(variantId)) {
    throw new Error("Invalid variant ID");
  }

  const variant = await VariantModel.findById(variantId)
    .populate({
      path: "attributes.attributeId",
      select: "name",
    })
    .populate({
      path: "attributes.valueId",
      select: "value",
    });

  if (!variant) {
    throw new Error(`Variant not found: ${variantId}`);
  }

  return variant;
};

export const validateCustomerAddress = async (
  customerId,
  shippingAddressId
) => {
  if (
    !mongoose.Types.ObjectId.isValid(customerId) ||
    !mongoose.Types.ObjectId.isValid(shippingAddressId)
  ) {
    throw new Error("Invalid customer or address ID");
  }

  const customer = await Usermodel.findById(customerId).select(
    "Addresses accountType"
  );

  if (!customer) {
    throw new Error("Customer not found");
  }

  const addressExists = customer.Addresses.some(
    (addr) => addr._id.toString() === shippingAddressId.toString()
  );

  if (!addressExists) {
    throw new Error(
      "Invalid shipping address. Address not found in your saved addresses."
    );
  }

  return customer;
};

export const validateVendorAddress = async (vendorId) => {
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    throw new Error("Invalid vendor ID");
  }

  const vendor = await Usermodel.findById(vendorId).select(
    "Addresses accountType fullName email"
  );

  if (!vendor) {
    throw new Error(`Vendor not found: ${vendorId}`);
  }

  if (!vendor.Addresses || vendor.Addresses.length === 0) {
    throw new Error("Vendor has not set up their shipping address");
  }

  const vendorAddress =
    vendor.Addresses.find((addr) => addr.isDefault) || vendor.Addresses[0];

  return {
    vendor,
    vendorAddressId: vendorAddress._id,
    vendorAddress: vendorAddress,
  };
};

export const calculateItemTotal = (price, quantity) => {
  return price * quantity;
};

export const prepareOrderItem = async (itemData, vendorId, vendorAddressId) => {
  const { productId, variantId, quantity } = itemData;

  let product,
    variant = null;
  let finalPrice = 0;

  product = await getProductById(productId);

  if (variantId) {
    variant = await getVariantById(variantId);

    if (variant.productId.toString() !== productId.toString()) {
      throw new Error(
        `Variant "${variantId}" does not belong to product "${productId}". This variant belongs to product "${variant.productId}".`
      );
    }

    finalPrice = variant.disCountPrice
      ? parseFloat(variant.disCountPrice)
      : variant.price;

    const stock = variant.stock;
    if (!product.unlimitedStock && stock < quantity) {
      throw new Error(
        `Insufficient stock for variant of "${product.name.en}". Available: ${stock}, Requested: ${quantity}`
      );
    }
  } else {
    finalPrice = product.disCountPrice
      ? parseFloat(product.disCountPrice)
      : parseFloat(product.mainPrice);

    const stock = product.stock;
    if (!product.unlimitedStock && stock < quantity) {
      throw new Error(
        `Insufficient stock for "${product.name.en}". Available: ${stock}, Requested: ${quantity}`
      );
    }
  }

  const selectedAttributes = variant
    ? variant.attributes.map((attr) => ({
        attributeName: attr.attributeId?.name?.en || "Attribute",
        value: attr.valueId?.value?.en || "Value",
      }))
    : [];

  const images = variant
    ? variant.images && variant.images.length > 0
      ? variant.images.map((img) => img.url)
      : product.images || []
    : product.images || [];

  const itemTotal = calculateItemTotal(finalPrice, quantity);

  return {
    productId: product._id,
    variantId: variantId || undefined,
    vendorId,
    vendorAddressId,
    quantity,
    priceAtPurchase: finalPrice,
    productName: {
      ar: product.name.ar || product.name.en,
      en: product.name.en,
    },
    selectedAttributes,
    images,
    itemTotal,
  };
};
