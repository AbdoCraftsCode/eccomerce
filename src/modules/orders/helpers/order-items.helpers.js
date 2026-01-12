// order-items.helpers.js
export const processCartItems = (cart, productsMap, vendorAddressesMap) => {
  let subtotal = 0;
  const formattedItems = [];
  for (const cartItem of cart.items) {
    const product = productsMap[cartItem.productId._id.toString()];
    if (!product) continue;
    let variant = null;
    let basePrice = Number(product.mainPrice) || 0;
    let discountPrice = Number(product.disCountPrice) || 0;
    if (cartItem.variantId && product.hasVariants) {
      variant = cartItem.variantId;
      if (variant) {
        basePrice = Number(variant.price) || basePrice;
        discountPrice = Number(variant.disCountPrice) || discountPrice;
      }
    }
    const applicablePrice = discountPrice > 0 ? discountPrice : basePrice;
    const itemTotal = applicablePrice * cartItem.quantity;
    subtotal += itemTotal;
    const vendorId = product.createdBy.toString();
    const vendorAddress = vendorAddressesMap[vendorId];
    const productName = typeof product.name === 'object'
      ? { en: product.name.en || '', ar: product.name.ar || '' }
      : { en: product.name || '', ar: product.name || '' };
    formattedItems.push({
      productId: product._id,
      variantId: variant?._id || null,
      productName,
      variantAttributes: variant ? variant.attributes : [],
      quantity: Math.floor(cartItem.quantity), // Ensure integer
      vendorAddress,
      unitPrice: applicablePrice,
      totalPrice: itemTotal,
      originalStock: variant ? variant.stock : product.stock,
    });
  }
  return { formattedItems, subtotal };
};