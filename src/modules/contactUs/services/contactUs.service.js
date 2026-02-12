import { ContactChatModel } from "../../../DB/models/contactChatSchema.js";
import { getContactUsErrorMessage } from "../helpers/responseMessages.js";

const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getContactUsErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};

export const getOrCreateUserChat = async (userId) => {
  let chat = await ContactChatModel.findOne({ user: userId });

  if (!chat) {
    chat = await ContactChatModel.create({
      user: userId,
      messages: [],
    });
  }

  return chat;
};

export const getAllChatsForAdmin = async (options = {}, lang = "en") => {
  const { page = 1, limit = 20 } = options;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const aggregationPipeline = [
    {
      $lookup: {
        from: "users",
        localField: "user",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    {
      $addFields: {
        lastMessageTime: {
          $ifNull: ["$lastMessageSentAt", "$updatedAt"],
        },
        lastMessagePreview: {
          $let: {
            vars: { lastMsg: { $arrayElemAt: ["$messages", -1] } },
            in: {
              content: "$$lastMsg.content",
              type: "$$lastMsg.type",
              senderType: "$$lastMsg.senderType",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        user: "$userDetails",
        lastMessageSentAt: 1,
        lastMessagePreview: 1,
        totalMessages: { $size: "$messages" },
        createdAt: 1,
        updatedAt: 1,
      },
    },
    { $sort: { lastMessageTime: -1 } },
    { $skip: skip },
    { $limit: limitNum },
  ];

  const countPipeline = [{ $count: "total" }];

  const [chats, totalResult] = await Promise.all([
    ContactChatModel.aggregate(aggregationPipeline),
    ContactChatModel.aggregate(countPipeline),
  ]);

  const total = totalResult[0]?.total || 0;

  const formattedChats = chats.map((chat) => ({
    _id: chat._id,
    user: chat.user
      ? {
          _id: chat.user._id,
          name: chat.user.fullName,
          email: chat.user.email,
          phone: chat.user.phone,
          avatar: chat.user.profiePicture,
        }
      : null,
    lastMessage: chat.lastMessagePreview,
    lastMessageSentAt: chat.lastMessageSentAt,
    totalMessages: chat.totalMessages || 0,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
  }));

  return {
    chats: formattedChats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
    meta: {
      totalChats: total,
      sortedBy: "lastMessageSentAt",
      order: "desc",
    },
  };
};

export const getChatById = async (chatId, user, options = {}, lang = "en") => {
  const { page = 1, limit = 50 } = options;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skipNum = (pageNum - 1) * limitNum;

  let chat;

  if (user.accountType === "Admin" || user.accountType === "Owner") {
    chat = await ContactChatModel.findById(chatId)
      .populate({
        path: "user",
        select: "fullName email phone profiePicture",
      })
      .lean();
  } else {
    chat = await ContactChatModel.findOne({
      _id: chatId,
      user: user._id,
    })
      .populate({
        path: "user",
        select: "fullName email phone profiePicture",
      })
      .lean();
  }

  if (!chat) {
    throwError("not_found", lang, {}, 404);
  }

  const sortedMessages = chat.messages.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const paginatedMessages = sortedMessages.slice(skipNum, skipNum + limitNum);

  const totalMessages = chat.messages.length;

  return {
    _id: chat._id,
    user: chat.user,
    lastMessageSentAt: chat.lastMessageSentAt,
    totalMessages,
    messages: paginatedMessages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalMessages,
      pages: Math.ceil(totalMessages / limitNum),
    },
  };
};

export const getUserChat = async (userId, options = {}, lang = "en") => {
  const { page = 1, limit = 50 } = options;
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skipNum = (pageNum - 1) * limitNum;

  let chat = await ContactChatModel.findOne({ user: userId })
    .populate({
      path: "user",
      select: "fullName email phone profiePicture",
    })
    .lean();

  if (!chat) {
    chat = await ContactChatModel.create({
      user: userId,
      messages: [],
    });

    chat = await ContactChatModel.findById(chat._id)
      .populate({
        path: "user",
        select: "fullName email phone profiePicture",
      })
      .lean();
  }

  const sortedMessages = chat.messages.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );

  const paginatedMessages = sortedMessages.slice(skipNum, skipNum + limitNum);

  const totalMessages = chat.messages.length;

  return {
    _id: chat._id,
    user: chat.user,
    lastMessageSentAt: chat.lastMessageSentAt,
    totalMessages,
    messages: paginatedMessages,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: totalMessages,
      pages: Math.ceil(totalMessages / limitNum),
    },
  };
};
