// helpers/stock.helpers.js - No changes
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";

export const reserveStockAtomic = async (
  productId,
  variantId,
  quantity,
  session = null
) => {
  try {
    const updateOptions = { session, new: true };
    if (variantId) {
      const variantBefore = await VariantModel.findById(variantId).session(session);
      if (variantBefore.unlimitedStock) {
        const result = await VariantModel.findByIdAndUpdate(
          variantId,
          { $inc: { reservedStock: quantity } },
          updateOptions
        );
        return { type: "variant", document: result };
      }
      const result = await VariantModel.findOneAndUpdate(
        {
          _id: variantId,
          isActive: true,
          $expr: {
            $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity],
          },
        },
        { $inc: { reservedStock: quantity } },
        updateOptions
      );
      if (!result) {
        const variant = await VariantModel.findById(variantId).session(session);
        const available = variant ? variant.stock - variant.reservedStock : 0;
        throw new Error(
          `Insufficient variant stock. Available: ${available}, Requested: ${quantity}`,
          { cause: 400 }
        );
      }
      return { type: "variant", document: result };
    } else {
      const productBefore = await ProductModellll.findById(productId).session(session);
      if (productBefore.unlimitedStock) {
        const result = await ProductModellll.findByIdAndUpdate(
          productId,
          { $inc: { reservedStock: quantity } },
          updateOptions
        );
        return { type: "product", document: result };
      }
      const result = await ProductModellll.findOneAndUpdate(
        {
          _id: productId,
          isActive: true,
          status: "published",
          $expr: {
            $gte: [{ $subtract: ["$stock", "$reservedStock"] }, quantity],
          },
        },
        { $inc: { reservedStock: quantity } },
        updateOptions
      );
      if (!result) {
        const product = await ProductModellll.findById(productId).session(session);
        const available = product ? product.stock - product.reservedStock : 0;
        throw new Error(
          `Insufficient product stock. Available: ${available}, Requested: ${quantity}`,
          { cause: 400 }
        );
      }
      return { type: "product", document: result };
    }
  } catch (error) {
    console.error("Reservation error:", error.message);
    throw error;
  }
};

export const releaseReservedStock = async (
  productId,
  variantId,
  quantity,
  session = null
) => {
  try {
    const updateOptions = { session, new: true };
    if (variantId) {
      await VariantModel.findByIdAndUpdate(
        variantId,
        { $inc: { reservedStock: -quantity }, $max: { reservedStock: 0 } },
        updateOptions
      );
    } else {
      await ProductModellll.findByIdAndUpdate(
        productId,
        { $inc: { reservedStock: -quantity }, $max: { reservedStock: 0 } },
        updateOptions
      );
    }
  } catch (error) {
    console.error("Release error:", error);
    throw error;
  }
};

export const confirmStockReservation = async (
  productId,
  variantId,
  quantity,
  session = null
) => {
  try {
    const updateOptions = { session, new: true };
    if (variantId) {
      await VariantModel.findByIdAndUpdate(
        variantId,
        {
          $inc: { stock: -quantity, reservedStock: -quantity },
          $max: { reservedStock: 0, stock: 0 },
        },
        updateOptions
      );
    } else {
      await ProductModellll.findByIdAndUpdate(
        productId,
        {
          $inc: { stock: -quantity, reservedStock: -quantity },
          $max: { reservedStock: 0, stock: 0 },
        },
        updateOptions
      );
    }
  } catch (error) {
    console.error("Confirm error:", error);
    throw error;
  }
};

export const reserveAllItemsStock = async (formattedItems, session = null) => {
  const results = [];
  for (const item of formattedItems) {
    try {
      const result = await reserveStockAtomic(
        item.productId,
        item.variantId,
        item.quantity,
        session
      );
      results.push({ success: true, item, reserved: result });
    } catch (error) {
      throw new Error(
        `Reservation failed for ${item.productName?.en || item.productName?.ar || 'item'}: ${error.message}`,
        { cause: 400 }
      );
    }
  }
  return results;
};