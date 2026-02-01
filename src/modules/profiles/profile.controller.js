import { asyncHandelr } from "../../utlis/response/error.response.js";
import * as services from "./services/profile.service.js";
import { getResponseMessage } from "./helpers/responseMessages.js"; 
import { getUserLanguage } from "../../utlis/localization/langUserHelper.js";

export const getMyProfile = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const lang = getUserLanguage(req);

  try {
    const userWithVirtuals = await services.getMyProfile(userId, lang);
    res.status(200).json({
      success: true,
      data: userWithVirtuals,
    });
  } catch (error) {
    next(error);
  }
});

export const updateMyProfile = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const updateData = req.body;
  const lang = getUserLanguage(req);

  try {
    const updatedUser = await services.updateMyProfile(userId, updateData, req.files, lang);
    res.status(200).json({
      success: true,
      message: getResponseMessage("updated", lang),
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export const removeProfilePicture = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const lang = getUserLanguage(req);

  try {
    const updatedUser = await services.removeProfilePicture(userId, lang);
    res.status(200).json({
      success: true,
      message: getResponseMessage("picture_removed", lang),
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export const changePassword = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;
  const lang = getUserLanguage(req);

  try {
    await services.changePassword(userId, oldPassword, newPassword, lang);
    res.status(200).json({
      success: true,
      message: getResponseMessage("password_changed", lang),
    });
  } catch (error) {
    next(error);
  }
});

export const confirmEmail = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { emailOTP } = req.body;
  const lang = getUserLanguage(req);

  try {
    const updatedUser = await services.confirmEmail(userId, emailOTP, lang);
    res.status(200).json({
      success: true,
      message: getResponseMessage("email_confirmed", lang),
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
});

export const resendConfirmEmail = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const lang = getUserLanguage(req);

  try {
    await services.resendConfirmEmail(userId, lang);
    res.status(200).json({
      success: true,
      message: getResponseMessage("verification_sent", lang),
    });
  } catch (error) {
    next(error);
  }
});