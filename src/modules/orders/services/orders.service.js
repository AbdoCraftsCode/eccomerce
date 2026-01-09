// import mongoose from "mongoose";
// import { Order } from "../../../DB/models/myorder.model.js";
// import Usermodel from "../../../../src/DB/models/User.model.js";
// import {
//   getProductById,
//   getVariantById,
//   validateCustomerAddress,
//   validateVendorAddress,
//   prepareOrderItem,
// } from "./orderHelper.service.js";

// export const createOrder = async ({
//   customerId,
//   shippingAddressId,
//   items,
//   taxAmount = 0,
//   shippingAmount = 0,
//   couponDiscount = 0,
//   currency = "USD",
//   paymentMethod = "payoneer",
//   customerNote = "",
// }) => {
//   try {
//     if (!customerId || !shippingAddressId || !items || items.length === 0) {
//       throw new Error(
//         "Missing required parameters: customerId, shippingAddressId, or items"
//       );
//     }

//     const customer = await validateCustomerAddress(
//       customerId,
//       shippingAddressId
//     );

//     const orderItems = [];
//     let subtotal = 0;
//     const vendorCache = new Map();

//     for (const item of items) {
//       try {
//         const { productId, variantId, quantity } = item;

//         if (!quantity || quantity < 1) {
//           throw new Error(`Invalid quantity for product ${productId}`);
//         }

//         const product = await getProductById(productId);
//         const vendorId = product.createdBy;

//         if (!vendorId) {
//           throw new Error(
//             `Product "${product.name.en}" has no assigned vendor`
//           );
//         }

//         const vendorKey = vendorId.toString();

//         if (!vendorCache.has(vendorKey)) {
//           try {
//             const vendorData = await validateVendorAddress(vendorId);
//             vendorCache.set(vendorKey, vendorData.vendorAddressId);
//           } catch (vendorError) {
//             throw new Error(
//               `Cannot purchase "${product.name.en}" — the seller has not set up their shipping address yet. Please remove this item from your cart.`
//             );
//           }
//         }
//       } catch (itemError) {
//         throw new Error(itemError.message);
//       }
//     }

//     for (const item of items) {
//       const { productId, variantId, quantity } = item;

//       const product = await getProductById(productId);
//       const vendorId = product.createdBy;
//       const vendorAddressId = vendorCache.get(vendorId.toString());

//       const orderItem = await prepareOrderItem(
//         { productId, variantId, quantity },
//         vendorId,
//         vendorAddressId
//       );

//       orderItems.push(orderItem);
//       subtotal += orderItem.itemTotal;
//     }

//     const totalAmount = subtotal + taxAmount + shippingAmount - couponDiscount;

//     if (totalAmount < 0) {
//       throw new Error("Invalid order total. Total amount cannot be negative.");
//     }


//     const order = new Order({
//       userId: customerId,
//       shippingAddress: shippingAddressId,
//       items: orderItems,
//       subtotal,
//       taxAmount,
//       shippingAmount,
//       discountAmount:couponDiscount,
//       totalAmount,
//       currency,
//       paymentMethod,
//       paymentStatus: "pending",
//       status: "pending",
//       customerNote,
//       createdBy: customerId,
//     });

//     await order.save();

//     return { order };
//   } catch (error) {
//     console.error("Error creating order:", error);
//     throw new Error(`Order creation failed: ${error.message}`);
//   }
// };

// export const prepareCheckoutOrder = async (checkoutData) => {
//   const {
//     customerId,
//     shippingAddressId,
//     cartItems,
//     taxAmount = 0,
//     shippingAmount = 0,
//     couponDiscount = 0,
//     currency = "USD",
//     paymentMethod = "payoneer",
//     customerNote = "",
//   } = checkoutData;

//   const orderItems = cartItems.map((item) => ({
//     productId: item.productId,
//     variantId: item.variantId,
//     quantity: item.quantity,
//   }));

//   const orderResult = await createOrder({
//     customerId,
//     shippingAddressId,
//     items: orderItems,
//     taxAmount,
//     shippingAmount,
//     couponDiscount,
//     currency,
//     paymentMethod,
//     customerNote,
//   });



//   return {
//     order: orderResult.order,
//   };
// };
