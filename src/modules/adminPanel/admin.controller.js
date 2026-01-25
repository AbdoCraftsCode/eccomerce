import { getDashboardStatsService } from "./admin.service.js";

export const getDashboardStats = async (req, res) => {
  try {
    const data = await getDashboardStatsService();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
