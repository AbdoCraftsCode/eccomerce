import { asyncHandelr } from "../../utlis/response/error.response.js";
import { createInvoiceFromOrderService } from "./invoice.service.js";
import { getInvoiceByIdService } from "./invoice.service.js";
import { updateInvoiceByIdService } from "./invoice.service.js";
import { deleteInvoiceByIdService } from "./invoice.service.js";
export const createInvoice = asyncHandelr(async (req, res) => {
    console.log(req.body);
  const vendorId = req.user._id;
  const { orderId, dueDate } = req.body;
  if (!orderId || !dueDate) {
    res.status(400);
    throw new Error("orderId and dueDate are required");
  }
    // console.log(req.body);
  const invoice = await createInvoiceFromOrderService({
    orderId,
    vendorId,
    dueDate,
  });

  res.status(201).json({
    success: true,
    message: "Invoice created successfully",
    data: invoice,
  });
});
//================
export const getInvoiceById = asyncHandelr(async (req, res) => {
    const { id } = req.params;
    const vendorId = req.user._id;
  
    const invoice = await getInvoiceByIdService(id, vendorId);
  
    res.status(200).json({
      success: true,
      data: invoice,
    });
  });
  //=====================
export const updateInvoiceById = asyncHandelr(async (req, res) => {
  const { id } = req.params;
  const vendorId = req.user._id;

  const invoice = await updateInvoiceByIdService(
    id,
    vendorId,
    req.body
  );

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    data: invoice,
  });
});
//===================

export const deleteInvoiceById = asyncHandelr(async (req, res) => {
  const { id } = req.params;
  const vendorId = req.user._id;

  await deleteInvoiceByIdService(id, vendorId);

  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully",
  });
});
