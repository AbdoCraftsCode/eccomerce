import { InvoiceModel } from "../../DB/models/invoice.model.js";
import {OrderModelUser} from "../../DB/models/orderSchemaUser.model.js";
import User from "../../DB/models/User.model.js";

export const createInvoiceFromOrderService = async ({
  orderId,
  vendorId,
  dueDate,
}) => {
  const order = await OrderModelUser.findById(orderId);
  if (!order) throw new Error("Order not found");

  const vendor = await User.findById(vendorId);
  if (!vendor) throw new Error("Vendor not found");

  const subtotal = order.totalAmount;
  const discount = order.discountAmount || 0;
  const taxRate = 15;
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const totalAmount = subtotal - discount + taxAmount;

  const invoice = await InvoiceModel.create({
    invoiceNumber: `INV-${Date.now()}`,
    orderId: order._id,
    vendorId,
    customerId: order.customerId,
    dueDate,

    bankDetails: {
        bankName: "Saudi National Bank",
        country: "Saudi Arabia",
        iban: "SA4420000001234567891234",
        swiftCode: "NCBKSAJE",
      },
    // bankDetails: {
    //     bankName: String,
    //     country: String,
    //     iban: String,
    //     swiftCode: String,
    //   },
  

    subtotal,
    discount,
    taxRate,
    taxAmount,
    totalAmount,
  });

  return invoice;
};
//====================
export const getInvoiceByIdService = async (invoiceId, vendorId) => {
    const invoice = await InvoiceModel.findOne({
      _id: invoiceId,
      vendorId,
    })
      .populate("vendorId", "fullName email")
      .populate("customerId", "fullName email phone country")
      .populate("orderId");
  
    if (!invoice) {
      throw new Error("Invoice not found");
    }
  
    return invoice;
  };
  //==================
  export const updateInvoiceByIdService = async (
    invoiceId,
    vendorId,
    updateData
  ) => {
    const allowedFields = [
      "dueDate",
      "discount",
      "taxRate",
      "notes",
      "status",
    ];
  
    const updates = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        updates[key] = updateData[key];
      }
    }
  
    const invoice = await InvoiceModel.findOne({
      _id: invoiceId,
      vendorId,
    });
  
    if (!invoice) {
      throw new Error("Invoice not found");
    }
  
    // Recalculate totals if needed
    if (updates.discount !== undefined || updates.taxRate !== undefined) {
      const discount = updates.discount ?? invoice.discount;
      const taxRate = updates.taxRate ?? invoice.taxRate;
  
      invoice.discount = discount;
      invoice.taxRate = taxRate;
      invoice.taxAmount =
        (invoice.subtotal - discount) * (taxRate / 100);
      invoice.totalAmount =
        invoice.subtotal - discount + invoice.taxAmount;
    }
  
    Object.assign(invoice, updates);
    await invoice.save();
  
    return invoice;
  };

//=========================
export const deleteInvoiceByIdService = async (invoiceId, vendorId) => {
    const invoice = await InvoiceModel.findOne({
      _id: invoiceId,
      vendorId,
    });
  
    if (!invoice) {
      throw new Error("Invoice not found");
    }
  
    if (invoice.status === "paid") {
      throw new Error("Paid invoices cannot be deleted");
    }
  
    await invoice.deleteOne();
  
    return true;
  };
//=======================  