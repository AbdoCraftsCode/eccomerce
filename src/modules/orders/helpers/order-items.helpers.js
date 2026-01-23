// helpers/order-items.helpers.js - Removed vendorAddress, added vendorId to items
export const processCartItems = (cart, productsMap) => {
  let subtotal = 0;
  const formattedItems = [];
  for (const cartItem of cart.items) {
    const product = productsMap[cartItem.productId._id.toString()];
    if (!product) continue;
    let variant = null;
    let basePrice = Number(product.mainPrice) || 0;
    let discountPrice = Number(product.disCountPrice) || 0;
    let bulkDiscountPercent = 0;
    if (!product.hasVariants && product.bulkDiscounts) {
      const discount = product.bulkDiscounts.find(
        (d) => cartItem.quantity >= d.minQty && cartItem.quantity <= d.maxQty,
      );
      if (discount) {
        bulkDiscountPercent = discount.discountPercent;
      }
    }
    if (cartItem.variantId && product.hasVariants) {
      variant = cartItem.variantId;
      if (variant) {
        basePrice = Number(variant.price) || basePrice;
        discountPrice = Number(variant.disCountPrice) || discountPrice;
      }
    }
    let applicablePrice = discountPrice > 0 ? discountPrice : basePrice;
    applicablePrice *= 1 - bulkDiscountPercent / 100;
    const itemTotal = applicablePrice * cartItem.quantity;
    subtotal += itemTotal;
    const productName =
      typeof product.name === "object"
        ? { en: product.name.en || "", ar: product.name.ar || "" }
        : { en: product.name || "", ar: product.name || "" };
    const weight = variant ? variant.weight : product.weight;
    formattedItems.push({
      productId: product._id,
      variantId: variant?._id || null,
      productName,
      variantAttributes: variant ? variant.attributes : [],
      quantity: Math.floor(cartItem.quantity),
      unitPrice: applicablePrice,
      totalPrice: itemTotal,
      originalStock: variant ? variant.stock : product.stock,
      weight,
      vendorId: product.createdBy, 
    });
  }
  return { formattedItems, subtotal };
};
