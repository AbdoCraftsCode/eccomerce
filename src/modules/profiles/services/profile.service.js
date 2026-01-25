import { asyncHandelr } from "../../../utlis/response/error.response.js";
import UserModel from "../../../DB/models/User.model.js";
import { PreferredFlavorModel } from "../../../DB/models/preferredFlavor.model.js";
import { FavoritePopgroupModel } from "../../../DB/models/favoritePopgroup.model.js";
import { PreferredProductTypeModel } from "../../../DB/models/preferredProductType.model.js";
import {
  generatehash,
  comparehash,
} from "../../../utlis/security/hash.security.js";
import cloudinary from "cloudinary";
import { sendemail } from "../../../utlis/email/sendemail.js";
import { emailTemplates } from "../helpers/emailTempates.js";

export const getMyProfile = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;

  const user = await UserModel.findById(userId)
    .select(
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil -categories -status",
    )
    .populate({
      path: "preferredFlavor",
      select: "name.ar name.en",
    })
    .populate({
      path: "favoritePopgroup",
      select: "name.ar name.en image",
    })
    .populate({
      path: "productType",
      select: "name.ar name.en",
    })
    .lean();

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const userWithVirtuals = {
    ...user,
    subscriptionDaysLeft: user.subscriptionDaysLeft,
    subscriptionDaysUsed: user.subscriptionDaysUsed,
  };

  res.status(200).json({
    success: true,
    data: userWithVirtuals,
  });
});

export const updateMyProfile = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const updateData = req.body;

  const allowedFields = [
    "fullName",
    "email",
    "phone",
    "country",
    "currency",
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

  const currentUser = await UserModel.findById(userId);
  if (!currentUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (req.files?.profilePicture && req.files.profilePicture[0]) {
    const file = req.files.profilePicture[0];

    try {
      const uploadResult = await cloudinary.uploader.upload(file.path, {
        folder: "profile-pictures",
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "fill" },
          { quality: "auto" },
        ],
      });
      if (currentUser.profiePicture && currentUser.profiePicture.public_id) {
        try {
          await cloudinary.uploader.destroy(
            currentUser.profiePicture.public_id,
          );
          console.log(
            `Deleted old profile picture: ${currentUser.profiePicture.public_id}`,
          );
        } catch (deleteError) {
          console.error(
            "Failed to delete old image from Cloudinary:",
            deleteError,
          );
        }
      }

      filteredUpdate.profiePicture = {
        secure_url: uploadResult.secure_url,
        public_id: uploadResult.public_id,
      };
    } catch (uploadError) {
      console.error("Error uploading profile picture:", uploadError);
      return next(
        new Error("Failed to upload profile picture", { cause: 500 }),
      );
    }
  }

  if (Object.keys(filteredUpdate).length === 0) {
    return next(
      new Error("No valid fields provided for update", { cause: 400 }),
    );
  }

  if (filteredUpdate.preferredFlavor !== undefined) {
    if (filteredUpdate.preferredFlavor === null) {
      filteredUpdate.preferredFlavor = null;
    } else {
      const flavorExists = await PreferredFlavorModel.findById(
        filteredUpdate.preferredFlavor,
      );
      if (!flavorExists) {
        return next(new Error("Preferred flavor not found", { cause: 404 }));
      }
    }
  }

  if (filteredUpdate.favoritePopgroup !== undefined) {
    if (filteredUpdate.favoritePopgroup === null) {
      filteredUpdate.favoritePopgroup = null;
    } else {
      const popgroupExists = await FavoritePopgroupModel.findById(
        filteredUpdate.favoritePopgroup,
      );
      if (!popgroupExists) {
        return next(new Error("Favorite popgroup not found", { cause: 404 }));
      }
    }
  }

  if (filteredUpdate.productType !== undefined) {
    if (filteredUpdate.productType === null) {
      filteredUpdate.productType = null;
    } else {
      const productTypeExists = await PreferredProductTypeModel.findById(
        filteredUpdate.productType,
      );
      if (!productTypeExists) {
        return next(new Error("Product type not found", { cause: 404 }));
      }
    }
  }

  if (filteredUpdate.email && currentUser.email !== filteredUpdate.email) {
    const emailOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    filteredUpdate.emailOTP = emailOTP;
    filteredUpdate.otpExpiresAt = otpExpiresAt;
    filteredUpdate.isConfirmed = false;

    const template = emailTemplates.emailVerification(
      emailOTP,
      currentUser.lang,
      currentUser.fullName,
    );

    await sendemail({
      to: [filteredUpdate.email],
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    filteredUpdate,
    {
      new: true,
      runValidators: true,
      select:
        "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    },
  )
    .populate({
      path: "preferredFlavor",
      select: "name.ar name.en",
    })
    .populate({
      path: "favoritePopgroup",
      select: "name.ar name.en image",
    })
    .populate({
      path: "productType",
      select: "name.ar name.en",
    })
    .populate({
      path: "categories",
      select: "name slug",
    });

  if (!updatedUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

export const removeProfilePicture = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;

  const currentUser = await UserModel.findById(userId);
  if (!currentUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (currentUser.profiePicture && currentUser.profiePicture.public_id) {
    try {
      await cloudinary.uploader.destroy(currentUser.profiePicture.public_id);
      console.log(
        `Deleted profile picture: ${currentUser.profiePicture.public_id}`,
      );
    } catch (error) {
      console.error("Failed to delete image from Cloudinary:", error);
    }
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userId,
    {
      profiePicture: null,
    },
    {
      new: true,
      select:
        "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    },
  )
    .populate({
      path: "preferredFlavor",
      select: "name.ar name.en",
    })
    .populate({
      path: "favoritePopgroup",
      select: "name.ar name.en image",
    })
    .populate({
      path: "productType",
      select: "name.ar name.en",
    });

  res.status(200).json({
    success: true,
    message: "Profile picture removed successfully",
    data: updatedUser,
  });
});

export const changePassword = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { oldPassword, newPassword } = req.body;

  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  const isMatch = comparehash({
    planText: oldPassword,
    valuehash: user.password,
  });
  if (!isMatch) {
    return next(new Error("Old password is incorrect", { cause: 400 }));
  }

  const hashedPassword = generatehash({ planText: newPassword });

  user.password = hashedPassword;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

export const confirmEmail = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { emailOTP } = req.body;

  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (!user.emailOTP) {
    return next(new Error("No pending email verification", { cause: 400 }));
  }

  if (user.emailOTP !== emailOTP) {
    user.attemptCount = (user.attemptCount || 0) + 1;

    if (user.attemptCount >= 5) {
      user.blockUntil = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      return next(
        new Error("Too many failed attempts. Try again in 30 minutes", {
          cause: 429,
        }),
      );
    }

    await user.save();
    return next(new Error("Invalid verification code", { cause: 400 }));
  }

  if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
    return next(new Error("Verification code has expired", { cause: 400 }));
  }

  user.isConfirmed = true;
  user.emailOTP = null;
  user.otpExpiresAt = null;
  user.attemptCount = 0;
  user.blockUntil = null;

  await user.save();

  const updatedUser = await UserModel.findById(userId)
    .select(
      "-password -emailOTP -forgetpasswordOTP -attemptCount -otpExpiresAt -blockUntil",
    )
    .populate({
      path: "preferredFlavor",
      select: "name.ar name.en",
    })
    .populate({
      path: "favoritePopgroup",
      select: "name.ar name.en image",
    })
    .populate({
      path: "productType",
      select: "name.ar name.en",
    });

  res.status(200).json({
    success: true,
    message: "Email confirmed successfully",
    data: updatedUser,
  });
});

export const resendConfirmEmail = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;

  const user = await UserModel.findById(userId);
  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (!user.email) {
    return next(new Error("Email not found for this user", { cause: 400 }));
  }

  if (user.isConfirmed) {
    return next(new Error("Email is already confirmed", { cause: 400 }));
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

  res.status(200).json({
    success: true,
    message: "Verification code sent to your email",
  });
});
