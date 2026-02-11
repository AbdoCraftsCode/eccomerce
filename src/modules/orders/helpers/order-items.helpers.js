import {
  convertToUSD,
  getCurrencyCode,
} from "../../currency/services/currency.service.js";
import { getExchangeRate } from "../../auth/service/changeCurrencyHelper.service.js";

/**
 * Convert an amount from one currency to another using exchange rate
 */
const convertAmount = async (amount, fromCode, toCode) => {
  if (!amount || isNaN(parseFloat(amount))) return 0;
  const val = parseFloat(amount);
  if (fromCode === toCode) return Number(val.toFixed(6));

  const rate = await getExchangeRate(fromCode, toCode);
  if (!rate || rate <= 0) {
    throw new Error(
      `Failed to get exchange rate from ${fromCode} to ${toCode}`,
      { cause: 503 }
    );
  }
  return Number((val * rate).toFixed(6));
};

/**
 * Build a product snapshot object for storing in the order
 */
const buildProductSnapshot = (product, currencyDetails) => {
  const name =
    typeof product.name === "object"
      ? { en: product.name.en || "", ar: product.name.ar || "" }
      : { en: product.name || "", ar: product.name || "" };

  const description =
    typeof product.description === "object"
      ? { en: product.description?.en || "", ar: product.description?.ar || "" }
      : { en: product.description || "", ar: product.description || "" };

  return {
    _id: product._id,
    name,
    description,
    images: product.images || [],
    weight: product.weight || null,
    currency: currencyDetails,
    mainPrice: { vendor: Number(product.mainPrice) || 0, customer: 0, usd: 0 },
    discountPrice: { vendor: Number(product.disCountPrice) || 0, customer: 0, usd: 0 },
  };
};

/**
 * Build a variant snapshot object for storing in the order
 */
const buildVariantSnapshot = (variant) => {
  const attributes = (variant.attributes || []).map((attr) => ({
    attributeName: attr.attributeId?.name || {},
    valueName: attr.valueId?.value || {},
    hexCode: attr.valueId?.hexCode || null,
  }));

  return {
    _id: variant._id,
    attributes,
    images: variant.images || [],
    weight: variant.weight || null,
    mainPrice: { vendor: Number(variant.price) || 0, customer: 0, usd: 0 },
    discountPrice: { vendor: Number(variant.disCountPrice) || 0, customer: 0, usd: 0 },
  };
};

/**
 * Process cart items: build embedded product/variant objects,
 * convert prices to USD and customer currency.
 *
 * @param {Object} cart - Cart with populated items
 * @param {Object} productsMap - Map of productId -> product
 * @param {string} customerCurrencyCode - Customer's preferred currency code (e.g. "EGP")
 * @returns {{ formattedItems, subtotal }}
 */
export const processCartItems = async (
  cart,
  productsMap,
  customerCurrencyCode = "USD"
) => {
  const formattedItems = [];
  const conversionPromises = [];

  // Collect items and their conversion needs
  for (const cartItem of cart.items) {
    const product = productsMap[cartItem.product._id.toString()];
    if (!product) continue;

    // Get product currency code
    const productCurrencyCode =
      product.currency?.code ||
      (typeof product.currency === "string"
        ? product.currency
        : null);

    // Build currency details object
    const currencyDetails = product.currency?._id
      ? {
          code: product.currency.code || "",
          name: {
            ar: product.currency.name?.ar || "",
            en: product.currency.name?.en || "",
          },
          symbol: product.currency.symbol || "",
        }
      : { code: productCurrencyCode || "USD", name: { ar: "", en: "" }, symbol: "" };

    // Build product snapshot
    const productSnapshot = buildProductSnapshot(product, currencyDetails);

    // Build variant snapshot if applicable
    let variantSnapshot = null;
    let variant = null;
    let basePrice = Number(product.mainPrice) || 0;
    let discountPrice = Number(product.disCountPrice) || 0;

    if (cartItem.variant && product.hasVariants) {
      variant = cartItem.variant;
      if (variant) {
        variantSnapshot = buildVariantSnapshot(variant);
        basePrice = Number(variant.price) || basePrice;
        discountPrice = Number(variant.disCountPrice) || discountPrice;
      }
    }

    // Determine applicable price (discount takes priority)
    const applicablePrice = discountPrice > 0 ? discountPrice : basePrice;
    const quantity = Math.floor(cartItem.quantity);
    const fromCode = productCurrencyCode || "USD";

    const item = {
      product: productSnapshot,
      variant: variantSnapshot,
      quantity,
      unitPrice: { vendor: applicablePrice, customer: 0, usd: 0 },
      totalPrice: { vendor: applicablePrice * quantity, customer: 0, usd: 0 },
      vendorId: product.createdBy,
      // Temp fields for conversion
      _basePrice: basePrice,
      _discountPrice: discountPrice,
      _fromCode: fromCode,
      _productId: product._id,
    };

    formattedItems.push(item);


    // Queue all conversion promises:
    // [0] unitPrice -> USD, [1] totalPrice -> USD,
    // [2] mainPrice -> USD, [3] discountPrice -> USD,
    // [4] mainPrice -> customerCurrency, [5] discountPrice -> customerCurrency
    // [6] unitPrice -> customerCurrency
    conversionPromises.push(
      convertToUSD(applicablePrice, product.currency?._id || product.currency),
      convertToUSD(
        applicablePrice * quantity,
        product.currency?._id || product.currency
      ),
      convertAmount(basePrice, fromCode, "USD"),
      convertAmount(discountPrice, fromCode, "USD"),
      convertAmount(basePrice, fromCode, customerCurrencyCode),
      convertAmount(discountPrice, fromCode, customerCurrencyCode),
      convertAmount(applicablePrice, fromCode, customerCurrencyCode)
    );
  }

  // Execute all conversions in parallel
  try {
    const converted = await Promise.all(conversionPromises);

    for (let i = 0; i < formattedItems.length; i++) {
      const offset = i * 7;
      const item = formattedItems[i];

      // Set USD and customer prices on item
      item.unitPrice.usd = converted[offset];
      item.unitPrice.customer = converted[offset + 6];
      item.totalPrice.usd = converted[offset + 1];
      item.totalPrice.customer = item.unitPrice.customer * item.quantity;

      // Set product multi-currency prices
      item.product.mainPrice.usd = converted[offset + 2];
      item.product.discountPrice.usd = converted[offset + 3];
      item.product.mainPrice.customer = converted[offset + 4];
      item.product.discountPrice.customer = converted[offset + 5];

      // If variant exists, also convert variant prices
      if (item.variant) {
        const variantMainPrice = item.variant.mainPrice.vendor;
        const variantDiscountPrice = item.variant.discountPrice.vendor;
        const fromCode = item._fromCode;

        // These are done synchronously using the same rate — we'll do a small batch
        const [vMainUSD, vDiscUSD, vMainCust, vDiscCust] = await Promise.all([
          convertAmount(variantMainPrice, fromCode, "USD"),
          convertAmount(variantDiscountPrice, fromCode, "USD"),
          convertAmount(variantMainPrice, fromCode, customerCurrencyCode),
          convertAmount(variantDiscountPrice, fromCode, customerCurrencyCode),
        ]);

        item.variant.mainPrice.usd = vMainUSD;
        item.variant.discountPrice.usd = vDiscUSD;
        item.variant.mainPrice.customer = vMainCust;
        item.variant.discountPrice.customer = vDiscCust;
      }

      // Clean up temp fields
      delete item._basePrice;
      delete item._discountPrice;
      delete item._fromCode;
      delete item._productId;
    }

    const subtotal = {
      vendor: formattedItems.reduce((sum, item) => sum + item.totalPrice.vendor, 0),
      customer: formattedItems.reduce((sum, item) => sum + item.totalPrice.customer, 0),
      usd: formattedItems.reduce((sum, item) => sum + item.totalPrice.usd, 0),
    };

    return { formattedItems, subtotal };
  } catch (error) {
    throw new Error(
      `Currency conversion failed: ${error.message}. Cannot process order at this time.`,
      { cause: 503 }
    );
  }
};