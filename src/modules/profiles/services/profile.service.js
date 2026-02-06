import UserModel from "../../../DB/models/User.model.js";
import { PreferredFlavorModel } from "../../../DB/models/preferredFlavor.model.js";
import { FavoritePopgroupModel } from "../../../DB/models/favoritePopgroup.model.js";
import { PreferredProductTypeModel } from "../../../DB/models/preferredProductType.model.js";
import { validateCurrencyId } from "../../currency/services/currency.service.js";
import { validateCountryId } from "../../country/services/country.service.js";
import {
  generatehash,
  comparehash,
} from "../../../utlis/security/hash.security.js";
import cloudinary from "cloudinary";
import { formatCurrencyForLanguage } from "../../currency/services/currency.service.js";
import { formatCountryForLanguage } from "../../country/services/country.service.js";
import { sendemail } from "../../../utlis/email/sendemail.js";
import { emailTemplates } from "../helpers/emailTempates.js";
import { findById, findByIdAndUpdate, findOne } from "../../../DB/dbservice.js";
import { throwError } from "../helpers/responseMessages.js";

export const getMyProfile = async (userId, lang) => {
  const userDoc = await findById({
    model: UserModel,
    id: userId,
    select:
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil -categories -status",
    populate: [
      { path: "preferredFlavor", select: "name.ar name.en" },
      { path: "favoritePopgroup", select: "name.ar name.en image" },
      { path: "productType", select: "name.ar name.en" },
      { path: "country", select: "name.ar name.en phoneCode flag _id" },
      { path: "currency", select: "name.ar name.en code symbol" },
    ],
  });

  if (!userDoc) {
    throwError("user_not_found", lang, {}, 404);
  }

  const user = userDoc.toObject();

  if (user.country) {
    user.country = formatCountryForLanguage(user.country, lang);
  }
  if (user.currency) {
    user.currency = formatCurrencyForLanguage(user.currency, lang);
  }

  const userWithVirtuals = {
    ...user,
    subscriptionDaysLeft: userDoc.subscriptionDaysLeft,
    subscriptionDaysUsed: userDoc.subscriptionDaysUsed,
  };

  return userWithVirtuals;
};

export const updateMyProfile = async (userId, updateData, files, lang) => {
  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "country",
    "currency",
    "companyName",
    "lang",
    "weight",
    "height",
    "preferredFlavor",
    "favoritePopgroup",
    "productType",
  ];

  const filteredUpdate = {};
  for (const key in updateData) {
    if (allowedFields.includes(key)) {
      filteredUpdate[key] = updateData[key];
    }
  }

  const currentUserDoc = await findById({
    model: UserModel,
    id: userId,
  });

  if (!currentUserDoc) {
    throwError("user_not_found", lang, {}, 404);
  }

  if (files?.profilePicture && files.profilePicture[0]) {
    const file = files.profilePicture[0];

    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "profile-pictures",
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill" },
          { quality: "auto" },
        ],
      });

      if (
        currentUserDoc.profiePicture &&
        currentUserDoc.profiePicture.public_id
      ) {
        try {
          await cloudinary.uploader.destroy(
            currentUserDoc.profiePicture.public_id,
          );
        } catch (deleteError) {
          console.error("Failed to delete old image:", deleteError);
        }
      }

      filteredUpdate.profiePicture = {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    } catch (uploadError) {
      console.error("Error uploading profile picture:", uploadError);
      throwError("upload_failed", lang, {}, 500);
    }
  }

  if (Object.keys(filteredUpdate).length === 0) {
    throwError("no_fields", lang, {}, 400);
  }

  if (filteredUpdate.preferredFlavor !== undefined) {
    if (filteredUpdate.preferredFlavor === null) {
      filteredUpdate.preferredFlavor = null;
    } else {
      const flavorExists = await findById({
        model: PreferredFlavorModel,
        id: filteredUpdate.preferredFlavor,
      });
      if (!flavorExists) {
        throwError("flavor_not_found", lang, {}, 404);
      }
    }
  }

  if (filteredUpdate.favoritePopgroup !== undefined) {
    if (filteredUpdate.favoritePopgroup === null) {
      filteredUpdate.favoritePopgroup = null;
    } else {
      const popgroupExists = await findById({
        model: FavoritePopgroupModel,
        id: filteredUpdate.favoritePopgroup,
      });
      if (!popgroupExists) {
        throwError("popgroup_not_found", lang, {}, 404);
      }
    }
  }

  if (filteredUpdate.productType !== undefined) {
    if (filteredUpdate.productType === null) {
      filteredUpdate.productType = null;
    } else {
      const productTypeExists = await findById({
        model: PreferredProductTypeModel,
        id: filteredUpdate.productType,
      });
      if (!productTypeExists) {
        throwError("product_type_not_found", lang, {}, 404);
      }
    }
  }

  if (filteredUpdate.country !== undefined) {
    if (filteredUpdate.country === null) {
      filteredUpdate.country = null;
    } else {
      await validateCountryId(filteredUpdate.country, lang);
    }
  }

  if (filteredUpdate.currency !== undefined) {
    if (filteredUpdate.currency === null) {
      filteredUpdate.currency = null;
    } else {
      await validateCurrencyId(filteredUpdate.currency, lang);
    }
  }

  if (filteredUpdate.email && currentUserDoc.email !== filteredUpdate.email) {
    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    filteredUpdate.emailOTP = emailOTP;
    filteredUpdate.otpExpiresAt = otpExpiresAt;
    filteredUpdate.isConfirmed = false;

    const template = emailTemplates.emailVerification(
      emailOTP,
      currentUserDoc.lang,
      currentUserDoc.fullName,
    );

    await sendemail({
      to: [filteredUpdate.email],
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  const updatedUserDoc = await findByIdAndUpdate({
    model: UserModel,
    id: userId,
    data: filteredUpdate,
    options: { new: true, runValidators: true },
    select:
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    populate: [
      { path: "preferredFlavor", select: "name.ar name.en" },
      { path: "favoritePopgroup", select: "name.ar name.en image" },
      { path: "productType", select: "name.ar name.en" },
      { path: "categories", select: "name slug" },
      { path: "country", select: "name.ar name.en phoneCode flag _id" },
      { path: "currency", select: "name.ar name.en code symbol" },
    ],
  });

  if (!updatedUserDoc) {
    throwError("user_not_found", lang, {}, 404);
  }

  const updatedUser = updatedUserDoc.toObject();

  if (updatedUser.country) {
    updatedUser.country = formatCountryForLanguage(updatedUser.country, lang);
  }
  if (updatedUser.currency) {
    updatedUser.currency = formatCurrencyForLanguage(
      updatedUser.currency,
      lang,
    );
  }

  return updatedUser;
};

export const removeProfilePicture = async (userId, lang) => {
  const currentUserDoc = await findById({
    model: UserModel,
    id: userId,
  });

  if (!currentUserDoc) {
    throwError("user_not_found", lang, {}, 404);
  }

  if (currentUserDoc.profiePicture && currentUserDoc.profiePicture.public_id) {
    try {
      await cloudinary.uploader.destroy(currentUserDoc.profiePicture.public_id);
      console.log(
        `Deleted profile picture: ${currentUserDoc.profiePicture.public_id}`,
      );
    } catch (error) {
      console.error("Failed to delete image from Cloudinary:", error);
    }
  }

  const updatedUserDoc = await findByIdAndUpdate({
    model: UserModel,
    id: userId,
    data: { profiePicture: null },
    options: { new: true },
    select:
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    populate: [
      { path: "preferredFlavor", select: "name.ar name.en" },
      { path: "favoritePopgroup", select: "name.ar name.en image" },
      { path: "productType", select: "name.ar name.en" },
      { path: "country", select: "name.ar name.en phoneCode flag _id" },
      { path: "currency", select: "name.ar name.en code symbol" },
    ],
  });

  const updatedUser = updatedUserDoc.toObject();

  if (updatedUser.country) {
    updatedUser.country = formatCountryForLanguage(updatedUser.country, lang);
  }
  if (updatedUser.currency) {
    updatedUser.currency = formatCurrencyForLanguage(
      updatedUser.currency,
      lang,
    );
  }

  return updatedUser;
};

export const changePassword = async (
  userId,
  oldPassword,
  newPassword,
  lang,
) => {
  const user = await findById({
    model: UserModel,
    id: userId,
  });

  if (!user) {
    throwError("user_not_found", lang, {}, 404);
  }

  const isMatch = comparehash({
    planText: oldPassword,
    valuehash: user.password,
  });
  if (!isMatch) {
    throwError("old_password_incorrect", lang, {}, 400);
  }

  const hashedPassword = generatehash({ planText: newPassword });

  user.password = hashedPassword;
  await user.save();
};

export const confirmEmail = async (userId, emailOTP, lang) => {
  const user = await findById({
    model: UserModel,
    id: userId,
  });

  if (!user) {
    throwError("user_not_found", lang, {}, 404);
  }

  if (!user.emailOTP) {
    throwError("no_pending_verification", lang, {}, 400);
  }

  if (user.emailOTP !== emailOTP) {
    user.attemptCount = (user.attemptCount || 0) + 1;

    if (user.attemptCount >= 5) {
      user.blockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      throwError("too_many_attempts", lang, {}, 429);
    }

    await user.save();
    throwError("invalid_code", lang, {}, 400);
  }

  if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
    throwError("code_expired", lang, {}, 400);
  }

  user.isConfirmed = true;
  user.emailOTP = null;
  user.otpExpiresAt = null;
  user.attemptCount = 0;
  user.blockUntil = null;

  await user.save();

  const updatedUser = await findById({
    model: UserModel,
    id: userId,
    select:
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    populate: [
      { path: "preferredFlavor", select: "name.ar name.en" },
      { path: "favoritePopgroup", select: "name.ar name.en image" },
      { path: "productType", select: "name.ar name.en" },
    ],
  });

  return updatedUser;
};

export const resendConfirmEmail = async (userId, lang) => {
  const user = await findById({
    model: UserModel,
    id: userId,
  });

  if (!user) {
    throwError("user_not_found", lang, {}, 404);
  }

  if (!user.email) {
    throwError("email_not_found", lang, {}, 400);
  }

  if (user.isConfirmed) {
    throwError("email_already_confirmed", lang, {}, 400);
  }

  const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

  user.emailOTP = emailOTP;
  user.otpExpiresAt = otpExpiresAt;
  user.attemptCount = 0;
  user.blockUntil = null;
  await user.save();

  const template = emailTemplates.emailVerification(
    emailOTP,
    user.lang,
    user.fullName,
  );

  await sendemail({
    to: [user.email],
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
};
