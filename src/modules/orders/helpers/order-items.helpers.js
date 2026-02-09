import { convertToUSD, getCurrencyCode } from "../../currency/services/currency.service.js";

export const processCartItemsWithUSD = async (cart, productsMap) => {
  const formattedItems = [];
  const conversionPromises = [];

  for (const cartItem of cart.items) {
    const product = productsMap[cartItem.product._id.toString()];
    if (!product) continue;

    let variant = null;
    let basePrice = Number(product.mainPrice) || 0;
    let discountPrice = Number(product.disCountPrice) || 0;
    let productCurrencyId = product.currency?._id || product.currency;

    // Handle variants
    if (cartItem.variant && product.hasVariants) {
      variant = cartItem.variant;
      if (variant) {
        basePrice = Number(variant.price) || basePrice;
        discountPrice = Number(variant.disCountPrice) || discountPrice;
        // Variant uses parent product's currency
      }
    }

    // Determine applicable price (discount takes priority)
    let applicablePrice = discountPrice > 0 ? discountPrice : basePrice;

    const productName =
      typeof product.name === "object"
        ? { en: product.name.en || "", ar: product.name.ar || "" }
        : { en: product.name || "", ar: product.name || "" };

    const weight = variant ? variant.weight : product.weight;

    // Create formatted item with original currency prices
    const item = {
      productId: product._id,
      variantId: variant?._id || null,
      productName,
      variantAttributes: variant ? variant.attributes : [],
      quantity: Math.floor(cartItem.quantity),
      unitPrice: applicablePrice, // Still in original currency
      totalPrice: applicablePrice * Math.floor(cartItem.quantity),
      originalStock: variant ? variant.stock : product.stock,
      weight,
      vendorId: product.createdBy,
      currencyId: productCurrencyId, // Store for conversion
    };

    formattedItems.push(item);

    // Queue conversion promises
    conversionPromises.push(
      convertToUSD(item.unitPrice, productCurrencyId),
      convertToUSD(item.totalPrice, productCurrencyId)
    );
  }

  // Execute all currency conversions in parallel
  // If ANY conversion fails, this will throw and abort the transaction
  try {
    const convertedValues = await Promise.all(conversionPromises);

    // Apply converted values back to items
    for (let i = 0; i < formattedItems.length; i++) {
      formattedItems[i].unitPrice = convertedValues[i * 2]; // unitPrice
      formattedItems[i].totalPrice = convertedValues[i * 2 + 1]; // totalPrice
      delete formattedItems[i].currencyId; // Remove temp field
    }

    const subtotal = formattedItems.reduce((sum, item) => sum + item.totalPrice, 0);

    return { formattedItems, subtotal };
  } catch (error) {
    throw new Error(
      `Currency conversion failed: ${error.message}. Cannot process order at this time.`,
      { cause: 503 }
    );
  }
};