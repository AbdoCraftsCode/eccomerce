import admin from "firebase-admin";
import Usermodel from "../../../DB/models/User.model.js";


const getNotificationContent = (senderType, senderName, lang = "en") => {
  const notifications = {
    en: {
      user_to_admin: {
        title: "New Customer Message",
        body: `${senderName} sent you a message`,
      },
      admin_to_user: {
        title: "Support Reply",
        body: `Support team replied to your message`,
      },
    },
    ar: {
      user_to_admin: {
        title: "رسالة جديدة من العميل",
        body: `${senderName} أرسل لك رسالة`,
      },
      admin_to_user: {
        title: "رد من الدعم الفني",
        body: `رد فريق الدعم على رسالتك`,
      },
    },
  };

  const key = senderType === "admin" ? "admin_to_user" : "user_to_admin";
  return notifications[lang]?.[key] || notifications.en[key];
};


const sendToUser = async (fcmToken, title, body, chatId, userLang) => {
  if (!fcmToken) return;

  const payload = {
    notification: {
      title,
      body,
    },
    data: {
      type: "chat_message",
      chatId: chatId.toString(),
    },
  };

  try {
    await admin.messaging().send({
      ...payload,
      token: fcmToken,
      android: { priority: "high" },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });
    console.log(`Chat notification sent to user with token: ${fcmToken}`);
  } catch (fcmError) {
    console.error("Failed to send chat notification:", fcmError.message);
    if (
      fcmError.message.includes("Requested entity was not found") ||
      fcmError.message.includes(
        "The registration token is not a valid FCM registration token",
      )
    ) {
      console.log(`Invalid FCM token detected: ${fcmToken}`);
    }
  }
};

export const sendChatNotification = async ({
  senderType,
  senderName,
  chatId,
  userId,
}) => {
  try {
    if (senderType === "admin") {
      const user = await Usermodel.findById(userId).select("fcmToken lang");
      if (!user || !user.fcmToken) {
        console.log(`User ${userId} has no FCM token`);
        return;
      }

      const content = getNotificationContent(
        senderType,
        senderName,
        user.lang || "en",
      );
      await sendToUser(
        user.fcmToken,
        content.title,
        content.body,
        chatId,
        user.lang || "en",
      );
    } else {
      const admins = await Usermodel.find({
        accountType: { $in: ["Admin", "Owner"] },
        fcmToken: { $ne: null },
      }).select("fcmToken lang");

      if (admins.length === 0) {
        console.log("No admins with FCM tokens found");
        return;
      }

      for (const adminUser of admins) {
        const content = getNotificationContent(
          senderType,
          senderName,
          adminUser.lang || "en",
        );
        await sendToUser(
          adminUser.fcmToken,
          content.title,
          content.body,
          chatId,
          adminUser.lang || "en",
        );
      }
    }
  } catch (error) {
    console.error("Error in sendChatNotification:", error);
  }
};
