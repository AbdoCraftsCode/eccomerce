import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { getAllCustomersService } from "./orders.service.js";
import { getAllOrdersService  } from "./orders.service.js";
import { getSubOrdersByOrderIdService } from "./orders.service.js";
import { getAllSubOrdersService } from "./orders.service.js";
import { getPaymentStatusStatsService } from "./orders.service.js";
import { getSubOrdersByVendorIdService } from "./orders.service.js";
import { getLastDayPaymentStatsService ,getLastMonthPaymentStatsService  } from "./orders.service.js";

export const getAllCustomers = asyncHandelr(async (req, res) => {
  const customers = await getAllCustomersService();

  res.status(200).json({
    success: true,
    count: customers.length,
    data: customers,
  });
});
//----------------------------------------------------------------------------
export const getAllOrders = asyncHandelr(async (req, res) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const result = await getAllOrdersService(req.query);

  res.status(200).json({
    success: true,
    message: "Orders fetched successfully",
    ...result,
  });
});
//-----------------------------------------------------------------------------------
export const getSubOrdersByOrderId = asyncHandelr(async (req, res, next) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const { orderId } = req.params;
  console.log(orderId);
  if (!orderId) {
    return next(new Error("Order ID is required", { cause: 400 }));
  }

  const subOrders = await getSubOrdersByOrderIdService(orderId);

  if (!subOrders.length) {
    return next(new Error("No suborders found for this order", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    count: subOrders.length,
    data: subOrders,
  });
});
//-----------------------------------------------------------------------------------------
export const getAllSubOrders = asyncHandelr(async (req, res) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const result = await getAllSubOrdersService(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
});

//=====================================================
export const getPaymentStatusStats = asyncHandelr(async (req, res) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const data = await getPaymentStatusStatsService();

  res.status(200).json({
    success: true,
    message: "Payment status statistics fetched successfully",
    data,
  });
});

//====================================================================
export const getDailyPaymentStats = asyncHandelr(async (req, res) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const data = await getLastDayPaymentStatsService();

  res.status(200).json({
    success: true,
    message: "Last daily payment statistics fetched successfully",
    data,
  });
});

//=========================================================
export const getMonthlyPaymentStats = asyncHandelr(async (req, res) => {
  if (req.user.accountType !== "Admin") {
    throw new Error("Only admin");
}
  const data = await getLastMonthPaymentStatsService();

  res.status(200).json({
    success: true,
    message: "Last monthly payment statistics fetched successfully",
    data,
  });
});

//====================================
export const getSubOrdersByVendorId = asyncHandelr(async (req, res) => {
   const  vendorId  = req.user._id;
   if (req.user.accountType !== "vendor") {
    throw new Error("Only vendors");
}
  const result = await getSubOrdersByVendorIdService(vendorId, req.query);

  res.status(200).json({
    success: true,
    message: "Suborders fetched successfully",
    ...result,
  });
});