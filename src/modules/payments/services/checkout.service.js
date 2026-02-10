import { asyncHandelr } from "../../../utlis/response/error.response.js";

import axios from "axios";
import { createOrderforUser } from "../../orders/services/orders.service.js";

const PAYONEER_CONFIG = {
  sandbox: {
    baseURL: "https://api.sandbox.oscato.com",
    username: process.env.PAYONEER_SANDBOX_USERNAME,
    token: process.env.PAYONEER_SANDBOX_TOKEN,
    division: process.env.PAYONEER_SANDBOX_DIVISION,
  },
  production: {
    baseURL: "https://api.live.oscato.com",
    username: process.env.PAYONEER_LIVE_USERNAME,
    token: process.env.PAYONEER_LIVE_TOKEN,
    division: process.env.PAYONEER_LIVE_DIVISION,
  },
};

const getPayoneerConfig = () => {
  return process.env.NODE_ENV === "production"
    ? PAYONEER_CONFIG.production
    : PAYONEER_CONFIG.sandbox;
};

export const a7a = (req, res, next) => {
  return res.status(201).json({
    success: true,
    message: "test a7a funciotn",
    data: req.user,
  });
};

export const checkout = asyncHandelr(async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { shippingAddressId, couponCode } = req.body;

    const lang = req.user?.lang || "en";
    const order = await createOrderforUser(
      userId,
      shippingAddressId,
      "cash_on_delivery",
      couponCode,
      lang
    );

    return res.status(201).json({
      success: true,
      message: "order created successfully",
      data: order,
    });

    // const order = orderResult.order;
    // const config = getPayoneerConfig();

    // if (!config.username || !config.token || !config.division) {
    //   return next(new Error("Payoneer credentials are not configured properly."));
    // }

    // const auth = Buffer.from(`${config.username}:${config.token}`).toString("base64");

    // const products = cartItems.map(item => ({
    //   code: item.productId?.toString() || "unknown",
    //   name: item.name || "Item",
    //   amount: item.price || 0,
    //   currency: order.currency,
    //   quantity: item.quantity || 1,
    //   // Add taxAmount per item if available
    // }));

    // // Payload for LIST request
    // const listPayload = {
    //   integration: "HOSTED", // Or "SELECTIVE_NATIVE" / "PURE_NATIVE" based on your integration
    //   transactionId: order.orderNumber,
    //   country: "US", // TODO: Make dynamic from shippingAddress or user
    //   division: config.division,
    //   operationType: "CHARGE",
    //   channel: "WEB_ORDER", // Or other channel as appropriate
    //   payment: {
    //     amount: order.totalAmount,
    //     currency: order.currency,
    //     // taxAmount: order.taxAmount, // Uncomment if available
    //   },
    //   products, // Include for detailed cart breakdown
    //   customer: {
    //     id: userId.toString(),
    //     email: req.user.email,
    //     name: {
    //       firstName: req.user.fullName?.split(" ")[0] || "First",
    //       lastName: req.user.fullName?.split(" ").slice(1).join(" ") || "Last",
    //     },
    //     // Add addresses, phones if available from req.user or shippingAddress
    //   },
    //   callback: {
    //     returnUrl: process.env.APP_FRONTEND_SUCCESS_URL || `${process.env.APP_URL}/payment/return`,
    //     cancelUrl: process.env.APP_FRONTEND_CANCEL_URL || `${process.env.APP_URL}/payment/cancel`,
    //     notificationUrl: `${process.env.APP_BASE_URL}/payment/webhook`,
    //   },
    //   // Optional: ttl: 30 (minutes, default 30)
    //   // metadata can be added if supported, e.g., customFields
    //   customFields: {
    //     internalOrderId: order._id.toString(),
    //     userId: userId.toString(),
    //     customerNote,
    //   },
    // };

    // const checkoutResponse = await axios.post(
    //   `${config.baseURL}/api/lists`,
    //   listPayload,
    //   {
    //     headers: {
    //       Authorization: `Basic ${auth}`,
    //       "Content-Type": "application/vnd.optile.payment.enterprise-v1-extensible+json",
    //       Accept: "application/vnd.optile.payment.enterprise-v1-extensible+json",
    //     },
    //   }
    // );

    // const responseData = checkoutResponse.data;

    // // Extract redirect URL from links (for HOSTED integration)
    // const redirectLink = responseData.links?.find(link => link.rel === "redirect");
    // const redirectUrl = redirectLink ? redirectLink.href : null;

    // if (!redirectUrl) {
    //   throw new Error("No redirect URL returned from Payoneer. Check integration type or response.");
    // }

    // res.status(200).json({
    //   success: true,
    //   data: {
    //     order: {
    //       id: order._id,
    //       orderNumber: order.orderNumber,
    //       totalAmount: order.totalAmount,
    //       currency: order.currency,
    //       status: order.status,
    //     },
    //     payment: {
    //       checkoutId: responseData.identification?.longId || responseData.links.self.split('/').pop(),
    //       redirectUrl,
    //     },
    //   },
    // });
  } catch (error) {
    console.error(
      "Checkout endpoint error:",
      error.response?.data || error.message,
    );

    if (error.response) {
      return next(
        new Error(
          `Payoneer API Error: ${JSON.stringify(error.response.data)}`,
          { cause: error.response.status },
        ),
      );
    } else if (error.request) {
      return next(new Error("No response from Payoneer API", { cause: 502 }));
    } else {
      next(error);
    }
  }
});
