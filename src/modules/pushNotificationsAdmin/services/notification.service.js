import { NotificationModel } from "../../../DB/models/pushNotificationsSchema.js";
import Usermodel from "../../../DB/models/User.model.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";
import admin from "firebase-admin";
import { throwError } from "../helpers/responseMessages.js";
import {
  create,
  findAll,
  findById,
  countDocuments,
  findByIdAndUpdate,
  aggregate,
} from "../../../DB/dbservice.js";

const getUserFcmTokens = async (audienceType, audienceDetails, lang) => {
  let userFilter = {};

  switch (audienceType) {
    case "all_users":
      userFilter = {};
      break;
    case "saved_slide":
      const now = new Date();
      let orderFilter = {};
      if (audienceDetails === "vip") {
        const usersWithOrders = await aggregate({
          model: OrderModelUser,
          pipeline: [
            { $group: { _id: "$customerId", orderCount: { $sum: 1 } } },
            { $match: { orderCount: { $gt: 10 } } },
            { $project: { _id: 1 } },
          ],
        });
        userFilter = { _id: { $in: usersWithOrders.map((u) => u._id) } };
      } else if (audienceDetails === "active_clients") {
        orderFilter = {
          createdAt: { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) },
        };
      } else if (audienceDetails === "non_active_users") {
        orderFilter = {
          createdAt: { $lte: new Date(now - 60 * 24 * 60 * 60 * 1000) },
        };
      } else if (audienceDetails === "new_users") {
        userFilter = {
          createdAt: { $gte: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        };
      }
      if (Object.keys(orderFilter).length > 0) {
        const usersWithOrders = await aggregate({
          model: OrderModelUser,
          pipeline: [
            { $match: orderFilter },
            { $group: { _id: "$customerId" } },
          ],
        });
        userFilter = { _id: { $in: usersWithOrders.map((u) => u._id) } };
      }
      break;
    case "specific_users":
      if (!audienceDetails?.userIds?.length) {
        throwError("users_required", lang, {}, 400);
      }
      userFilter = { _id: { $in: audienceDetails.userIds } };
      break;
    case "specific_filters":
      if (!audienceDetails) {
        throwError("filters_required", lang, {}, 400);
      }
      if (audienceDetails.country) {
        userFilter.country = audienceDetails.country;
      }
      if (audienceDetails.status) {
        userFilter.status = audienceDetails.status;
      }
      if (audienceDetails.lang) {
        userFilter.lang = audienceDetails.lang;
      }
      break;
    default:
      throwError("invalid_audience", lang, {}, 400);
  }

  const users = await findAll({
    model: Usermodel,
    filter: { ...userFilter, fcmToken: { $ne: null } },
    select: "fcmToken",
  });

  if (users.length === 0) {
    throwError("no_users", lang, {}, 400);
  }

  return users.map((u) => ({ fcmToken: u.fcmToken, lang: u.lang }));
};

const sendNotification = async (notification, usersData) => {
  try {
    for (const userData of usersData) {
      const { fcmToken, lang } = userData;

      if (fcmToken) {
        const payload = {
          notification: {
            title: notification.title[lang] || notification.title.en,
            body: notification.body[lang] || notification.body.en,
          },
          data: {
            procedure: notification.clickProcedure,
            link: notification.externalLink || "",
          },
        };

        try {
          await admin.messaging().send({
            ...payload,
            token: fcmToken,
            android: { priority: "high" },
          });
          console.log(`Push notification sent to user with token: ${fcmToken}`);
        } catch (fcmError) {
          console.error("Failed to send push notification:", fcmError.message);
          if (
            fcmError.message.includes("Requested entity was not found") ||
            fcmError.message.includes(
              "The registration token is not a valid FCM registration token",
            )
          ) {
            console.log(`Invalid FCM token detected: ${fcmToken}`);
          }
        }
      }
    }
    return "done";
  } catch (error) {
    console.error("FCM send error:", error);
    return "failed";
  }
};

export const formatNotificationForLanguage = (notification, lang) => {
  if (!notification) return null;

  const obj = notification.toObject
    ? notification.toObject()
    : { ...notification };

  obj.title = notification.title?.[lang] || notification.title?.en;
  obj.body = notification.body?.[lang] || notification.body?.en;

  return obj;
};

export const formatNotificationsForLanguage = (notifications, lang) => {
  return notifications.map((n) => formatNotificationForLanguage(n, lang));
};

export const createNotification = async (req, lang) => {
  const user = req.user;
  const {
    type,
    title,
    body,
    image,
    clickProcedure,
    externalLink,
    audienceType,
    audienceDetails,
    sendAt,
  } = req.body;

  if (!title?.ar || !title?.en) {
    throwError("title_required", lang, {}, 400);
  }

  if (!body?.ar || !body?.en) {
    throwError("body_required", lang, {}, 400);
  }

  const isScheduled = sendAt && new Date(sendAt) > new Date();
  const status = isScheduled ? "pending" : "sending";

  const notification = await create({
    model: NotificationModel,
    data: {
      type,
      title,
      body,
      image: image || null,
      clickProcedure,
      externalLink:
        clickProcedure === "open_external_link" ? externalLink : null,
      audienceType,
      audienceDetails,
      sendAt: sendAt ? new Date(sendAt) : new Date(),
      status,
      createdBy: user._id,
    },
  });

  if (!isScheduled) {
    const usersData = await getUserFcmTokens(
      audienceType,
      audienceDetails,
      lang,
    );
    const sendResult = await sendNotification(notification, usersData);
    await findByIdAndUpdate({
      model: NotificationModel,
      id: notification._id,
      data: { status: sendResult },
    });
  }

  return formatNotificationForLanguage(notification, lang);
};

export const getNotifications = async (req, lang) => {
  const { type, status, fromDate, toDate, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const notifications = await findAll({
    model: NotificationModel,
    filter,
    skip,
    limit: parseInt(limit),
    sort: { createdAt: -1 },
  });

  const total = await countDocuments({
    model: NotificationModel,
    filter,
  });

  const formattedNotifications = formatNotificationsForLanguage(
    notifications,
    lang,
  );

  return {
    notifications: formattedNotifications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getNotificationStats = async (req, lang) => {
  const stats = await aggregate({
    model: NotificationModel,
    pipeline: [
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ],
  });

  const total = await countDocuments({ model: NotificationModel });

  const result = {
    total,
    done: 0,
    sending: 0,
    failed: 0,
    pending: 0,
  };

  stats.forEach((s) => {
    if (s._id === "done") result.done = s.count;
    if (s._id === "sending") result.sending = s.count;
    if (s._id === "failed") result.failed = s.count;
    if (s._id === "pending") result.pending = s.count;
  });

  return result;
};
