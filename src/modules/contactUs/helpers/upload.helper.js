import cloudinary from "../../../utlis/multer/cloudinary.js";
import { getContactUsErrorMessage } from "./responseMessages.js";

const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getContactUsErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};


export const uploadChatImage = async (file, lang) => {
  if (!file) {
    throwError("no_file", lang, {}, 400);
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: "contact-us/images",
      resource_type: "image",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    };
  } catch (error) {
    console.error("Error uploading chat image:", error);
    throwError("upload_failed", lang, {}, 500);
  }
};


export const uploadChatVoice = async (file, lang) => {
  if (!file) {
    throwError("no_file", lang, {}, 400);
  }

  try {
    const uploadResult = await cloudinary.uploader.upload(file.path, {
      folder: "contact-us/voices",
      resource_type: "video",
      format: "mp3",
    });

    return {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      duration: uploadResult.duration || 0, 
    };
  } catch (error) {
    console.error("Error uploading voice file:", error);
    throwError("upload_failed", lang, {}, 500);
  }
};
