import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as contactUsService from "./services/contactUs.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js";
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";
import { uploadChatImage, uploadChatVoice } from "./helpers/upload.helper.js";

export const getAllChatsForAdmin = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { page, limit } = req.query;

  const result = await contactUsService.getAllChatsForAdmin(
    { page, limit },
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched", lang),
    data: result.chats,
    pagination: result.pagination,
    meta: result.meta,
  });
});

export const getChatByIdForAdmin = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { chatId } = req.params;
  const { page, limit } = req.query;

  const result = await contactUsService.getChatById(
    chatId,
    req.user,
    { page, limit },
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_single", lang),
    data: result,
  });
});

export const getUserChat = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);
  const { page, limit } = req.query;

  const result = await contactUsService.getUserChat(
    req.user._id,
    { page, limit },
    lang,
  );

  res.status(200).json({
    success: true,
    message: getResponseMessage("fetched_single", lang),
    data: result,
  });
});

export const uploadImage = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: getResponseMessage("no_file", lang),
    });
  }

  const imageData = await uploadChatImage(req.file, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("upload_success", lang),
    data: imageData,
  });
});

export const uploadVoice = asyncHandelr(async (req, res) => {
  const lang = getUserLanguage(req);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: getResponseMessage("no_file", lang),
    });
  }

  const voiceData = await uploadChatVoice(req.file, lang);

  res.status(200).json({
    success: true,
    message: getResponseMessage("upload_success", lang),
    data: voiceData,
  });
});
