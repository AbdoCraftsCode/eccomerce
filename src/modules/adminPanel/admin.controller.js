import { getDashboardStatsService } from "./admin.service.js";
import { asyncHandelr } from "../../utlis/response/error.response.js";

export const getDashboardStats = asyncHandelr(async (req, res, next) => {
  const data = await getDashboardStatsService(req.user);
  res.status(200).json({
    "status":"success",
    "message":"states retrieved successfully",
    "data":data
  });
});
