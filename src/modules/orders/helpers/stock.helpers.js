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
      const variantBefore = await VariantModel.findById(variantId).session(session).lean();
      
      if (!variantBefore) {
        throw new Error(`Variant not found`, { cause: 404 });
      }
      
      if (!variantBefore.isActive) {
        throw new Error(`Variant is not active`, { cause: 400 });
      }
      
      // Reserve stock (even for unlimited stock as per requirement)
      if (variantBefore.unlimitedStock) {
        const result = await VariantModel.findByIdAndUpdate(
          variantId,
          { $inc: { reservedStock: quantity } },
          updateOptions
        );
        return { type: "variant", document: result };
      }
      
      // Atomic validation + reservation in single query
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
        const variant = await VariantModel.findById(variantId).session(session).lean();
        const available = variant ? variant.stock - variant.reservedStock : 0;
        throw new Error(
          `Insufficient variant stock. Available: ${available}, Requested: ${quantity}`,
          { cause: 400 }
        );
      }
      
      return { type: "variant", document: result };
    } else {
      // Product-level reservation
      const productBefore = await ProductModellll.findById(productId).session(session).lean();
      
      if (!productBefore) {
        throw new Error(`Product not found`, { cause: 404 });
      }
      
      if (!productBefore.isActive || productBefore.status !== "published") {
        throw new Error(`Product is not available`, { cause: 400 });
      }
      
      // Reserve stock (even for unlimited stock)
      if (productBefore.unlimitedStock) {
        const result = await ProductModellll.findByIdAndUpdate(
          productId,
          { $inc: { reservedStock: quantity } },
          updateOptions
        );
        return { type: "product", document: result };
      }
      
      // Atomic validation + reservation
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
        const product = await ProductModellll.findById(productId).session(session).lean();
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
        { 
          $inc: { reservedStock: -quantity },
          $max: { reservedStock: 0 } 
        },
        updateOptions
      );
    } else {
      await ProductModellll.findByIdAndUpdate(
        productId,
        { 
          $inc: { reservedStock: -quantity },
          $max: { reservedStock: 0 } 
        },
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

/**
 * Reserve stock for all items atomically
 * If any item fails, all previous reservations are rolled back via session abort
 */
export const reserveAllItemsStock = async (formattedItems, session = null) => {
  const results = [];
  
  for (const item of formattedItems) {
    try {
      const productId = item.product?._id || item.productId;
      const variantId = item.variant?._id || item.variantId || null;
      const productName = item.product?.name?.en || item.product?.name?.ar || 'item';
      const result = await reserveStockAtomic(
        productId,
        variantId,
        item.quantity,
        session
      );
      results.push({ success: true, item, reserved: result });
    } catch (error) {
      // Don't manually release here - session abort will handle rollback
      throw new Error(
        `Reservation failed for ${item.product?.name?.en || item.product?.name?.ar || 'item'}: ${error.message}`,
        { cause: error.cause || 400 }
      );
    }
  }
  
  return results;
};

/**
 * Release stock for multiple items (used in error cleanup)
 */
export const releaseMultipleStocks = async (items, session = null) => {
  for (const item of items) {
    try {
      const productId = item.product?._id || item.productId;
      const variantId = item.variant?._id || item.variantId || null;
      await releaseReservedStock(
        productId,
        variantId,
        item.quantity,
        session
      );
    } catch (error) {
      console.error(`Failed to release stock for item:`, item, error);
      // Continue releasing other items even if one fails
    }
  }
};