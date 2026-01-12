// stock.helpers.js
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
      const variantBefore = await VariantModel.findById(variantId);
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
        const variant = await VariantModel.findById(variantId);
        const available = variant ? variant.stock - variant.reservedStock : 0;
        throw new Error(
          `Insufficient variant stock. Available: ${available}, Requested: ${quantity}`
        );
      }
      return { type: "variant", document: result };
    } else {
      const productBefore = await ProductModellll.findById(productId).session(
        session
      );
      console.log("Product before:", {
        id: productId,
        stock: productBefore?.stock,
        reservedStock: productBefore?.reservedStock,
        available: productBefore?.stock - productBefore?.reservedStock,
      });
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
        const product = await ProductModellll.findById(productId).session(
          session
        );
        const available = product ? product.stock - product.reservedStock : 0;
        throw new Error(
          `Insufficient product stock. Available: ${available}, Requested: ${quantity}`
        );
      }
      console.log("Product reserved successfully");
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
        { $inc: { reservedStock: -quantity }, $max: { reservedStock: 0 } }, // Prevent negative
        updateOptions
      );
    } else {
      await ProductModellll.findByIdAndUpdate(
        productId,
        { $inc: { reservedStock: -quantity }, $max: { reservedStock: 0 } },
        updateOptions
      );
    }
    console.log(`Released ${quantity} for ${variantId || productId}`);
  } catch (error) {
    console.error("Release error:", error);
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
    console.log(`Confirmed ${quantity} for ${variantId || productId}`);
  } catch (error) {
    console.error("Confirm error:", error);
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
        `Reservation failed for ${item.productName?.en || item.productName?.ar || 'item'}: ${error.message}`
      );
    }
  }

  return results;
};






// export const reserveAllItemsStock = async (formattedItems, session = null) => {
//   for (const item of formattedItems) {
//     const validation = await validateStockAvailability(
//       item.productId,
//       item.variantId,
//       item.quantity,
//       session
//     );
//     if (!validation.available) {
//       throw new Error(
//         `Pre-check failed for ${item.productId || item.variantId}: ${
//           validation.message
//         }`
//       );
//     }
//   }

//   const reservePromises = formattedItems.map(async (item) => {
//     try {
//       const result = await reserveStockAtomic(
//         item.productId,
//         item.variantId,
//         item.quantity,
//         session
//       );
//       return { success: true, item, reserved: result };
//     } catch (error) {
//       return {
//         success: false,
//         item,
//         error: error.message,
//         productName: item.productName.en || item.productName.ar,
//       };
//     }
//   });
//   const results = await Promise.all(reservePromises);
//   const failedReservations = results.filter((r) => !r.success);
//   if (failedReservations.length > 0) {
//     const successfulReservations = results.filter((r) => r.success);
//     for (const res of successfulReservations) {
//       await releaseReservedStock(
//         res.item.productId,
//         res.item.variantId,
//         res.item.quantity,
//         session
//       );
//     }
//     const errorMessages = failedReservations
//       .map((fr) => `${fr.productName}: ${fr.error}`)
//       .join(", ");
//     throw new Error(`Reservation failed: ${errorMessages}`);
//   }
//   return results;
// };
