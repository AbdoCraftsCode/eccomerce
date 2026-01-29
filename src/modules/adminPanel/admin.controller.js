import { getDashboardStatsService } from "./admin.service.js";
import { asyncHandelr } from "../../utlis/response/error.response.js";
import { SubOrderModel } from "../../DB/models/subOrdersSchema.model.js"; // Adjust path
import mongoose from 'mongoose';


export const getDashboardStats = asyncHandelr(async (req, res, next) => {
  const data = await getDashboardStatsService(req.user);
  res.status(200).json({
    "status":"success",
    "message":"states retrieved successfully",
    "data":data
  });
});
//===========================================grok================


// Assuming you have the necessary models imported in your controller file:
// import { SubOrderModel } from './path/to/subOrderModel';
// import Usermodel from './path/to/userModel'; // Not directly used in aggregation, but for reference
// import mongoose from 'mongoose';

// Example controller to fetch customers for a vendor
// This assumes the vendor is authenticated, and req.user._id is the vendor's ID
// You can adjust to accept vendorId as a param if needed (e.g., for admin)
