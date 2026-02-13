import { Router } from "express";
import * as contactUsController from "./contactUs.controller.js";
import { validation } from "../../middlewere/validation.middlewere.js";
import {
  authentication,
  authorization,
} from "../../middlewere/authontcation.middlewere.js";
import {
  getAllChatsForAdminSchema,
  getChatByIdSchema,
  getUserChatSchema,
} from "./contactUs.validation.js";
import {
  uploadCloudFile,
  fileValidationTypes,
} from "../../utlis/multer/cloud.multer.js";

const imageUpload = uploadCloudFile([...fileValidationTypes.image]).single(
  "image",
);
const voiceUpload = uploadCloudFile([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/3gpp2",
  "audio/aac",
  "audio/x-m4a",
  "audio/flac",
  "audio/x-wav",
  "audio/3gpp",
]).single("voice");

const router = Router();

router.get(
  "/admin/chats",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(getAllChatsForAdminSchema),
  contactUsController.getAllChatsForAdmin,
);

router.get(
  "/admin/chats/:chatId",
  authentication(),
  authorization(["Admin", "Owner"]),
  validation(getChatByIdSchema),
  contactUsController.getChatByIdForAdmin,
);

router.get(
  "/my-chat",
  authentication(),
  validation(getUserChatSchema),
  contactUsController.getUserChat,
);

router.post(
  "/upload/image",
  authentication(),
  imageUpload,
  contactUsController.uploadImage,
);

router.post(
  "/upload/voice",
  authentication(),
  voiceUpload,
  contactUsController.uploadVoice,
);

export default router;
