import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as notificationService from "./services/notification.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const createNotification = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const notification = await notificationService.createNotification(req, lang);

  res.status(201).json({
    success: true,
    message: getResponseMessage("created", lang),
    data: notification,
  });
});

export const getNotifications = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const result = await notificationService.getNotifications(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result,
  });
});

export const getNotificationStats = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const stats = await notificationService.getNotificationStats(req, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_stats", lang),
    data: stats,
  });
});