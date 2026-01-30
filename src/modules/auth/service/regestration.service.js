import { asyncHandelr } from "../../../utlis/response/error.response.js";
import * as dbservice from "../../../DB/dbservice.js";
import Usermodel, {
  providerTypes,
  roletypes,
} from "../../../DB/models/User.model.js";
import {
  comparehash,
  generatehash,
} from "../../../utlis/security/hash.security.js";
import { successresponse } from "../../../utlis/response/success.response.js";
import { OAuth2Client } from "google-auth-library";
import { generatetoken } from "../../../utlis/security/Token.security.js";
import cloud from "../../../utlis/multer/cloudinary.js";
import mongoose from "mongoose";
import moment from "moment";
import NodeGeocoder from "node-geocoder";
import fetch from "node-fetch";
import { ImageModel } from "../../../DB/models/imageSchema.model.js";
import { verifyOTP } from "./authontecation.service.js";
import AppSettingsSchema from "../../../DB/models/AppSettingsSchema.js";
import dotenv from "dotenv";
import { AdminUserModel } from "../../../DB/models/adminUserSchema.model.js";
import { NotificationModell } from "../../../DB/models/notificationSchema.js";
import admin from "firebase-admin";
import { customAlphabet } from "nanoid";
import fs from "fs";
import {
  verifyAuthOTP,
  sendOTP,
} from "../../../utlis/authentica/authenticaHelper.js";
import haversine from "haversine-distance";
import { sendemail } from "../../../utlis/email/sendemail.js";
import { vervicaionemailtemplet } from "../../../utlis/temblete/vervication.email.js";

dotenv.config();

export const signup = asyncHandelr(async (req, res, next) => {
  const {
    fullName,
    password,
    email,
    phone,

    country,
    currency,
    lang,
    weight,
    height,
    preferredFlavor,
    favoritePopgroup,
    productType,
  } = req.body;

  // ✅ لازم فون أو إيميل واحد على الأقل
  if (!email && !phone) {
    return next(
      new Error("يجب إدخال البريد الإلكتروني أو رقم الهاتف", { cause: 400 }),
    );
  }

  // ✅ التأكد إن الإيميل أو الفون مش مستخدمين قبل كده
  const checkuser = await dbservice.findOne({
    model: Usermodel,
    filter: {
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  if (checkuser) {
    if (
      checkuser.accountType === "ServiceProvider" &&
      (checkuser.serviceType === "Delivery" ||
        checkuser.serviceType === "Driver")
    ) {
      console.log(" الإيميل/الفون موجود لمقدم خدمة — مسموح تسجيل User جديد");
    } else {
      if (email && checkuser.email === email) {
        return next(
          new Error("البريد الإلكتروني مستخدم من قبل", { cause: 400 }),
        );
      }
      if (phone && checkuser.phone === phone) {
        return next(new Error("رقم الهاتف مستخدم من قبل", { cause: 400 }));
      }
    }
  }

  // ✅ تشفير الباسورد
  const hashpassword = await generatehash({ planText: password });

  // ✅ إنشاء المستخدم (مُفعل مباشرة)
  const user = await dbservice.create({
    model: Usermodel,
    data: {
      fullName,
      password: hashpassword,
      email,
      phone,

      country,
      currency,
      lang,
      weight,
      height,
      preferredFlavor,
      favoritePopgroup,
      productType,

      accountType: "User",
      isConfirmed: true, // ✅ بدون OTP
    },
  });

  // ✅ نفس التوكنات بتاعة confirOtp
  const access_Token = generatetoken({ payload: { id: user._id } });
  const refreshToken = generatetoken({
    payload: { id: user._id },
    expiresIn: "365d",
  });

  return successresponse(res, "تم انشاء السحاب  بنجاحا ", 200, {
    access_Token,
    refreshToken,
    user,
  });
});

export const forgetPassword = asyncHandelr(async (req, res, next) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    return next(
      new Error("❌ Email or phone number is required", { cause: 400 }),
    );
  }

  let baseFilter = {
    $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
  };

  const user = await Usermodel.findOne(baseFilter);

  if (!user) {
    return next(new Error("❌ User not found", { cause: 404 }));
  }

  if (phone) {
    try {
      const response = await sendOTP(phone, "whatsapp");

      return res.json({
        success: true,
        message: "✅ Verification code sent to phone number",
        user,
        otpInfo: response,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "❌ Failed to send verification code via phone",
        details: error.response?.data || error.message,
      });
    }
  }

  if (email) {
    try {
      const otp = customAlphabet("0123456789", 4)();

      const html = vervicaionemailtemplet({ code: otp });
      const hashedOtp = await generatehash({ planText: otp });

      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const updateResult = await Usermodel.updateOne(
        { _id: user._id },
        { forgetpasswordOTP: hashedOtp, otpExpiresAt, attemptCount: 0 },
      );

      await sendemail({
        to: email,
        subject: "🔐 Password Recovery",
        text: "Password recovery code",
        html,
      });

      // Fetch user after update to verify
      const updatedUser = await Usermodel.findById(user._id).select(
        "forgetpasswordOTP otpExpiresAt",
      );

      return res.json({
        success: true,
        message: "✅ Verification code sent to email",
        user,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "❌ Failed to send verification code via email",
        details: error.message,
      });
    }
  }
});

export const resetPassword = asyncHandelr(async (req, res, next) => {
  const { email, phone, otp, newPassword } = req.body;

  if ((!email && !phone) || !otp || !newPassword) {
    return next(
      new Error(
        "❌ Please enter (email or phone) + verification code + new password",
        { cause: 400 },
      ),
    );
  }

  if (email && phone) {
    return next(
      new Error("❌ You can use email or phone only, not both", { cause: 400 }),
    );
  }

  let user;
  if (email) {
    user = await Usermodel.findOne({ email });
  } else if (phone) {
    user = await Usermodel.findOne({ phone });
  }

  if (!user) {
    return next(new Error("❌ User not found", { cause: 404 }));
  }

  if (user.blockUntil && Date.now() < new Date(user.blockUntil).getTime()) {
    console.log("User is blocked until:", user.blockUntil.toISOString()); // Debug: Block check
    return next(new Error("🚫 You are temporarily blocked", { cause: 429 }));
  }

  if (email) {
    if (!user.forgetpasswordOTP) {
      return next(
        new Error("❌ No verification code sent to this account", {
          cause: 400,
        }),
      );
    }

    if (Date.now() > new Date(user.otpExpiresAt).getTime()) {
      return next(new Error("❌ Verification code expired", { cause: 400 }));
    }

    const isValidOTP = await comparehash({
      planText: `${otp}`,
      valuehash: user.forgetpasswordOTP,
    });

    if (!isValidOTP) {
      const attempts = (user.attemptCount || 0) + 1;

      if (attempts >= 5) {
        const blockUpdate = await Usermodel.updateOne(
          { email },
          {
            blockUntil: new Date(Date.now() + 2 * 60 * 1000),
            attemptCount: 0,
          },
        );

        return next(
          new Error(
            "🚫 You are temporarily blocked after too many failed attempts",
            { cause: 429 },
          ),
        );
      }
      const attemptUpdate = await Usermodel.updateOne(
        { email },
        { attemptCount: attempts },
      );

      return next(new Error("❌ Invalid verification code", { cause: 400 }));
    }

    const hashedPassword = await generatehash({ planText: newPassword });

    const updateResult = await Usermodel.updateOne(
      { _id: user._id },
      {
        password: hashedPassword,
        $unset: {
          forgetpasswordOTP: "",
          otpExpiresAt: "",
          attemptCount: "",
          blockUntil: "",
        },
      },
    );

    // Fetch user after update to verify
    const updatedUser = await Usermodel.findById(user._id).select(
      "password forgetpasswordOTP otpExpiresAt",
    );
    console.log("User after password reset:", {
      password: updatedUser.password,
      forgetpasswordOTP: updatedUser.forgetpasswordOTP,
      otpExpiresAt: updatedUser.otpExpiresAt,
    }); // Debug: Verify changes

    if (updateResult.matchedCount === 0 || updateResult.modifiedCount === 0) {
      console.log("Update failed: No document matched or modified"); // Debug: Update failure
      return next(new Error("❌ Failed to update password", { cause: 500 }));
    }

    return successresponse(
      res,
      "✅ Password changed successfully via email",
      200,
    );
  }

  if (phone) {
    try {
      const response = await verifyAuthOTP(phone, otp);

      console.log("Phone OTP verification response:", response);

      if (response?.status === true) {
        const hashedPassword = await generatehash({ planText: newPassword });

        const updateResult = await Usermodel.updateOne(
          { _id: user._id },
          {
            password: hashedPassword,
            isConfirmed: true,
            changeCredentialTime: Date.now(),
            $unset: {
              forgetpasswordOTP: "",
              otpExpiresAt: "",
              attemptCount: "",
              blockUntil: "",
            },
          },
        );

        if (
          updateResult.matchedCount === 0 ||
          updateResult.modifiedCount === 0
        ) {
          console.log("Phone update failed: No document matched or modified");
          return next(
            new Error("❌ Failed to update password", { cause: 500 }),
          );
        }

        return successresponse(
          res,
          "✅ Password reset successfully via phone",
          200,
        );
      } else {
        return next(
          new Error("❌ Invalid or expired verification code", { cause: 400 }),
        );
      }
    } catch (error) {
      console.error(
        "❌ Failed to verify OTP via Authentica:",
        error.response?.data || error.message,
      );
      return next(
        new Error("❌ Failed to verify OTP via phone", { cause: 500 }),
      );
    }
  }
});

export const signupServiceProvider = asyncHandelr(async (req, res, next) => {
  const {
    fullName,
    password,
    carNumber,
    accountType,
    email,
    phone,
    serviceType,
  } = req.body;

  // ✅ تحقق من وجود واحد من الاتنين فقط
  if (!email && !phone) {
    return next(
      new Error("يجب إدخال البريد الإلكتروني أو رقم الهاتف", { cause: 400 }),
    );
  }

  // ✅ تحقق من وجود نوع الخدمة
  if (
    !serviceType ||
    !["Driver", "Doctor", "Host", "Delivery"].includes(serviceType)
  ) {
    return next(new Error("نوع الخدمة غير صحيح أو مفقود", { cause: 400 }));
  }

  // ✅ تحقق من وجود مستخدم بنفس الإيميل أو الهاتف
  const checkuser = await dbservice.findOne({
    model: Usermodel,
    filter: {
      $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  if (checkuser) {
    // ✅ لو المستخدم الحالي نوعه User → ممكن يسجل كمقدم خدمة
    if (checkuser.accountType === "User") {
      console.log("✅ المستخدم موجود كـ User، يمكنه التسجيل كمقدم خدمة.");

      // ✅ يسمح له فقط بالتسجيل كـ Driver أو Delivery
      if (["Driver", "Delivery"].includes(serviceType)) {
        console.log(
          `🚗 المستخدم User يسجل الآن كمقدم خدمة ${serviceType}، مسموح بالتسجيل.`,
        );
      } else {
        return next(
          new Error(
            `❌ لا يمكنك التسجيل كـ ${serviceType} باستخدام حساب User. فقط Driver أو Delivery مسموحين.`,
            { cause: 400 },
          ),
        );
      }
    }

    // ❌ لو المستخدم مقدم خدمة بالفعل بنفس النوع → مرفوض
    else if (
      checkuser.accountType === "ServiceProvider" &&
      checkuser.serviceType === serviceType
    ) {
      return next(
        new Error(`أنت مسجل بالفعل كمقدم خدمة بنفس النوع (${serviceType})`, {
          cause: 400,
        }),
      );
    }

    // ❌ لو كان مقدم خدمة Driver لا يسجل كـ Delivery والعكس
    else if (
      checkuser.accountType === "ServiceProvider" &&
      ((checkuser.serviceType === "Driver" && serviceType === "Delivery") ||
        (checkuser.serviceType === "Delivery" && serviceType === "Driver"))
    ) {
      return next(
        new Error("❌ لا يمكنك التسجيل كـ Driver و Delivery في نفس الوقت.", {
          cause: 400,
        }),
      );
    }

    // ❌ لو كان مقدم خدمة Host لا يسجل كـ Doctor والعكس
    else if (
      checkuser.accountType === "ServiceProvider" &&
      ((checkuser.serviceType === "Host" && serviceType === "Doctor") ||
        (checkuser.serviceType === "Doctor" && serviceType === "Host"))
    ) {
      return next(
        new Error("❌ لا يمكنك التسجيل كـ Host و Doctor في نفس الوقت.", {
          cause: 400,
        }),
      );
    }

    // ✅ غير ذلك، مسموح له يسجل كخدمة مختلفة
    else {
      console.log("✅ المستخدم مقدم خدمة بنوع مختلف، يسمح بالتسجيل.");
    }
  }

  // ✅ تشفير كلمة المرور
  const hashpassword = await generatehash({ planText: password });

  // ✅ رفع الملفات (من req.files)
  const uploadedFiles = {};

  const uploadToCloud = async (file, folder) => {
    const isPDF = file.mimetype === "application/pdf";

    const uploaded = await cloud.uploader.upload(file.path, {
      folder,
      resource_type: isPDF ? "raw" : "auto", // ← أهم نقطة هنا
    });

    return {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  };

  // صورة البطاقة
  if (req.files?.nationalIdImage?.[0]) {
    uploadedFiles.nationalIdImage = await uploadToCloud(
      req.files.nationalIdImage[0],
      `users/nationalIds`,
    );
  }

  // رخصة القيادة
  if (req.files?.driverLicenseImage?.[0]) {
    uploadedFiles.driverLicenseImage = await uploadToCloud(
      req.files.driverLicenseImage[0],
      `users/driverLicenses`,
    );
  }

  // رخصة العربية
  if (req.files?.carLicenseImage?.[0]) {
    uploadedFiles.carLicenseImage = await uploadToCloud(
      req.files.carLicenseImage[0],
      `users/carLicenses`,
    );
  }

  // صور العربية
  if (req.files?.carImages) {
    uploadedFiles.carImages = [];
    for (const file of req.files.carImages) {
      const uploaded = await uploadToCloud(file, `users/carImages`);
      uploadedFiles.carImages.push(uploaded);
    }
  }

  // مستندات إضافية (بدون Array)
  if (req.files?.Insurancedocuments?.[0]) {
    uploadedFiles.Insurancedocuments = await uploadToCloud(
      req.files.Insurancedocuments[0],
      `users/additionalDocs`,
    );
  }

  // صورة البروفايل
  if (req.files?.profiePicture?.[0]) {
    uploadedFiles.profiePicture = await uploadToCloud(
      req.files.profiePicture[0],
      `users/profilePictures`,
    );
  }

  // ✅ إنشاء المستخدم
  const user = await dbservice.create({
    model: Usermodel,
    data: {
      fullName,
      carNumber,
      password: hashpassword,
      email,
      phone,
      accountType,
      serviceType,
      location: {
        type: "Point",
        coordinates: [
          req.body.longitude || 0, // ← خط الطول
          req.body.latitude || 0, // ← خط العرض
        ],
      },
      ...uploadedFiles,
    },
  });

  try {
    if (phone) {
      await sendOTP(phone);
      console.log(`📩 OTP تم إرساله إلى الهاتف: ${phone}`);
    } else if (email) {
      const otp = customAlphabet("0123456789", 4)();
      const html = vervicaionemailtemplet({ code: otp });

      const emailOTP = await generatehash({ planText: `${otp}` });
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await Usermodel.updateOne(
        { _id: user._id },
        {
          emailOTP,
          otpExpiresAt,
          attemptCount: 0,
        },
      );

      await sendemail({
        to: email,
        subject: "Confirm Email",
        text: "رمز التحقق الخاص بك",
        html,
      });

      console.log(`📩 OTP تم إرساله إلى البريد: ${email}`);
    }
  } catch (error) {
    console.error("❌ فشل في إرسال OTP:", error.message);
    return next(new Error("فشل في إرسال رمز التحقق", { cause: 500 }));
  }

  return successresponse(
    res,
    "تم إنشاء حساب مقدم الخدمة بنجاح، وتم إرسال رمز التحقق",
    201,
  );
});

export const updateUser = asyncHandelr(async (req, res, next) => {
  const { id } = req.params; // 👈 بنجيب ال id من الرابط
  const { fullName, password, email, phone, kiloPrice, isAgree, totalPoints } =
    req.body;

  // ✅ تحقق من وجود المستخدم
  const user = await dbservice.findOne({
    model: Usermodel,
    filter: { _id: id },
  });

  if (!user) {
    return next(new Error("المستخدم غير موجود", { cause: 404 }));
  }

  // ✅ تحقق من عدم تكرار الإيميل أو رقم الهاتف (لو المستخدم بيغيرهم)
  if (email || phone) {
    const checkuser = await dbservice.findOne({
      model: Usermodel,
      filter: {
        $and: [
          { _id: { $ne: id } }, // 👈 استبعاد نفس المستخدم
          {
            $or: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
          },
        ],
      },
    });

    if (checkuser) {
      if (checkuser.email === email) {
        return next(
          new Error("البريد الإلكتروني مستخدم من قبل", { cause: 400 }),
        );
      }
      if (checkuser.phone === phone) {
        return next(new Error("رقم الهاتف مستخدم من قبل", { cause: 400 }));
      }
    }
  }

  // ✅ لو فيه باسورد جديد يتعمله هاش
  let hashpassword;
  if (password) {
    hashpassword = await generatehash({ planText: password });
  }

  // ✅ تعديل البيانات
  const updatedUser = await dbservice.updateOne({
    model: Usermodel,
    filter: { _id: id },
    data: {
      ...(fullName && { fullName }),
      ...(kiloPrice && { kiloPrice }),
      ...(isAgree && { isAgree }),
      ...(totalPoints && { totalPoints }),
      ...(hashpassword && { password: hashpassword }),
      ...(email && { email }),
      ...(phone && { phone }),
    },
  });

  return successresponse(res, "✅ تم تعديل بيانات المستخدم بنجاح", 200);
});

export const getAllNormalUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    // جلب المستخدمين
    const users = await Usermodel.find({ accountType: "User" })
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    // عدد المستخدمين الكلي
    const totalUsers = await Usermodel.countDocuments({ accountType: "User" });

    return res.status(200).json({
      message: "تم جلب المستخدمين بنجاح",
      total: totalUsers,
      page: Number(page),
      pages: Math.ceil(totalUsers / limit),
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllServiceProviders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, serviceType } = req.query;
    const skip = (page - 1) * limit;

    // فلتر أساسي
    const filter = { accountType: "ServiceProvider" };

    // فلترة على حسب serviceType (اختياري)
    if (serviceType) {
      const cleanServiceType = String(serviceType).trim();
      filter.serviceType = { $regex: `^${cleanServiceType}$`, $options: "i" };
    }

    // جلب البيانات
    const serviceProviders = await Usermodel.find(filter)
      .sort({ createdAt: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    // إجمالي العدد
    const total = await Usermodel.countDocuments(filter);

    return res.status(200).json({
      message: "تم جلب مزودي الخدمة بنجاح",
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: serviceProviders,
    });
  } catch (error) {
    next(error);
  }
};

export const addAuthorizedUser = asyncHandelr(async (req, res, next) => {
  const { restaurantId, userId, role } = req.body;

  // تحقق أن المستخدم الحالي هو الـ Owner
  const restaurant = await RestaurantModell.findOne({
    _id: restaurantId,
    createdBy: req.user._id,
  });

  if (!restaurant) {
    return next(new Error("لا يمكنك تعديل هذا المطعم", { cause: 403 }));
  }

  // تحقق أن المستخدم موجود
  const targetUser = await Usermodel.findById(userId);
  if (!targetUser) {
    return next(new Error("المستخدم غير موجود", { cause: 404 }));
  }

  // تحقق إذا كان المستخدم مضاف مسبقاً
  const alreadyExists = restaurant.authorizedUsers.some(
    (auth) => auth.user.toString() === userId,
  );
  if (alreadyExists) {
    return next(new Error("المستخدم مضاف بالفعل", { cause: 400 }));
  }

  // إضافة المستخدم المصرح له
  restaurant.authorizedUsers.push({
    user: userId,
    role: role || "manager",
  });
  await restaurant.save();

  // إرجاع المطعم مع بيانات المستخدمين المصرح لهم
  const updatedRestaurant = await RestaurantModell.findById(
    restaurant._id,
  ).populate("authorizedUsers.user", "fullName email");

  res.status(200).json({
    message: "تم إضافة المستخدم المصرح له بنجاح",
    data: updatedRestaurant,
  });
});

export const updateProduct = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  // 🔍 التحقق من وجود المنتج وصلاحية المستخدم
  const product = await ProductModell.findOne({ _id: id, createdBy: userId });
  if (!product) {
    return next(
      new Error("المنتج غير موجود أو ليس لديك صلاحية لتعديله", { cause: 404 }),
    );
  }

  // 🟢 تجهيز البيانات المحدثة
  let updatedData = { ...req.body };

  // ✅ دالة تنظيف النصوص
  const trimIfString = (val) => (typeof val === "string" ? val.trim() : val);
  ["name", "description"].forEach((field) => {
    if (updatedData[field])
      updatedData[field] = trimIfString(updatedData[field]);
  });

  // ✅ دالة آمنة لتحويل النص إلى JSON عند الحاجة
  const tryParse = (val, fallback) => {
    if (typeof val === "string") {
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    }
    return val ?? fallback;
  };

  // ✅ دالة رفع الصور إلى Cloudinary
  const uploadToCloud = async (file, folder) => {
    const uploaded = await cloud.uploader.upload(file.path, {
      folder,
      resource_type: "auto",
    });
    return {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  };

  // 🟢 إدارة الصور (images)
  if (req.body.removedImages || req.files?.images) {
    let finalImages = Array.isArray(product.images) ? [...product.images] : [];

    // 🛑 1- حذف الصور القديمة المطلوبة
    if (req.body.removedImages) {
      let removedImages = [];
      try {
        removedImages = JSON.parse(req.body.removedImages);
      } catch {
        removedImages = req.body.removedImages;
      }

      if (Array.isArray(removedImages)) {
        for (const imgId of removedImages) {
          const img = finalImages.find((c) => c.public_id === imgId);
          if (img) {
            await cloud.uploader.destroy(img.public_id);
            finalImages = finalImages.filter((c) => c.public_id !== imgId);
          }
        }
      }
    }

    // 🟢 2- إضافة الصور الجديدة
    if (req.files?.images) {
      const files = Array.isArray(req.files.images)
        ? req.files.images
        : [req.files.images];

      for (const file of files) {
        const uploaded = await uploadToCloud(file, "restaurants/products");
        finalImages.push(uploaded);
      }
    }

    updatedData.images = finalImages;
  }

  // 🟢 تحديث البيانات في قاعدة البيانات
  const updatedProduct = await ProductModell.findOneAndUpdate(
    { _id: id, createdBy: userId },
    updatedData,
    { new: true },
  );

  return res.status(200).json({
    message: "تم تحديث بيانات المنتج بنجاح ✅",
    data: updatedProduct,
  });
});

export const createProduct = asyncHandelr(async (req, res, next) => {
  let { restaurantId, name, description, price, discount } = req.body;

  name = name?.trim();
  description = description?.trim();

  // ✅ تحقق من الحقول المطلوبة
  if (!restaurantId || !name || !price) {
    return next(new Error("جميع الحقول الأساسية مطلوبة", { cause: 400 }));
  }

  // رفع صور المنتج
  let uploadedImages = [];
  if (req.files?.images) {
    for (const file of req.files.images) {
      const uploaded = await cloud.uploader.upload(file.path, {
        folder: "restaurants/products",
      });
      uploadedImages.push({
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      });
    }
  }

  // إنشاء المنتج
  const product = await ProductModell.create({
    restaurant: restaurantId,
    name,
    description,
    images: uploadedImages,
    price,
    discount: discount || 0,
    createdBy: req.user._id,
  });

  return res.status(201).json({
    message: "تم إنشاء المنتج بنجاح",
    data: product,
  });
});

export const deleteProduct = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  // 🔍 البحث عن المنتج والتأكد من أن المستخدم هو المنشئ
  const product = await ProductModell.findOne({ _id: id, createdBy: userId });

  if (!product) {
    return next(
      new Error("المنتج غير موجود أو ليس لديك صلاحية لحذفه", { cause: 404 }),
    );
  }

  // 🧹 حذف الصور من Cloudinary
  if (Array.isArray(product.images) && product.images.length > 0) {
    for (const img of product.images) {
      if (img.public_id) {
        await cloud.uploader.destroy(img.public_id);
      }
    }
  }

  // 🗑️ حذف المنتج من قاعدة البيانات
  await ProductModell.deleteOne({ _id: id, createdBy: userId });

  return res.status(200).json({
    message: "تم حذف المنتج بنجاح ✅",
  });
});

export const getNotificationsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // جلب الإشعارات الخاصة بالعقار
    const notifications = await NotificationModell.find({ order: propertyId })
      .populate("order", "title location price") // يجيب بيانات العقار
      .sort({ createdAt: -1 }); // الأحدث أولاً

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    console.error("❌ Error fetching property notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch property notifications",
      error: error.message,
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // تحديث كل الإشعارات الخاصة بالمطعم كـ "مقروءة"
    const result = await NotificationModell.updateMany(
      { restaurant: restaurantId, isRead: false }, // فقط غير المقروء
      { $set: { isRead: true } },
    );

    res.status(200).json({
      success: true,
      message: "✅ تم تعليم كل الإشعارات كمقروءة",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notifications as read",
      error: error.message,
    });
  }
};

export const markAllNotificationsAsReadProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // تحديث كل الإشعارات الخاصة بالعقار كـ "مقروءة"
    const result = await NotificationModell.updateMany(
      { order: propertyId, isRead: false }, // فقط الغير مقروء
      { $set: { isRead: true } },
    );

    res.status(200).json({
      success: true,
      message: "✅ تم تعليم كل الإشعارات الخاصة بالعقار كمقروءة",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error marking property notifications as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark property notifications as read",
      error: error.message,
    });
  }
};

export const sendotpphone = asyncHandelr(async (req, res, next) => {
  const { phone } = req.body;

  const checkuser = await dbservice.findOne({
    model: Usermodel,
    filter: {
      mobileNumber: phone,
      isConfirmed: true,
    },
  });

  if (!checkuser) {
    return next(new Error("Phone not exist", { cause: 400 }));
  }

  try {
    await sendOTP(phone);
    console.log(`📩 OTP تم إرساله إلى ${phone}`);
  } catch (error) {
    console.error("❌ فشل في إرسال OTP:", error.message);
    return next(new Error("Failed to send OTP", { cause: 500 }));
  }

  return successresponse(res, "User found successfully, OTP sent!", 201);
});

export const signupwithGmail = asyncHandelr(async (req, res, next) => {
  const { idToken } = req.body;
  const client = new OAuth2Client();

  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.CIENT_ID,
    });
    return ticket.getPayload();
  }

  const payload = await verify();
  console.log("Google Payload Data:", payload);

  const { name, email, email_verified, picture } = payload;

  if (!email) {
    return next(
      new Error("Email is missing in Google response", { cause: 400 }),
    );
  }
  if (!email_verified) {
    return next(new Error("Email not verified", { cause: 404 }));
  }

  let user = await dbservice.findOne({
    model: Usermodel,
    filter: { email },
  });

  if (user?.provider === providerTypes.system) {
    return next(new Error("Invalid account", { cause: 404 }));
  }

  if (!user) {
    user = await dbservice.create({
      model: Usermodel,
      data: {
        email,
        username: name,
        profilePic: { secure_url: picture },
        isConfirmed: email_verified,
        provider: providerTypes.google,
      },
    });
  }

  const access_Token = generatetoken({
    payload: { id: user._id },
    signature:
      user?.role === roletypes.Admin
        ? process.env.SYSTEM_ACCESS_TOKEN
        : process.env.USER_ACCESS_TOKEN,
  });

  const refreshToken = generatetoken({
    payload: { id: user._id },
    signature:
      user?.role === roletypes.Admin
        ? process.env.SYSTEM_REFRESH_TOKEN
        : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000,
  });

  return successresponse(res, "Login successful", 200, {
    access_Token,
    refreshToken,
  });
});

export const confirmOTP = asyncHandelr(async (req, res, next) => {
  const { code, email } = req.body;

  const user = await dbservice.findOne({ model: Usermodel, filter: { email } });
  if (!user) {
    return next(new Error("Email does not exist tmm", { cause: 404 }));
  }

  if (user.blockUntil && Date.now() < new Date(user.blockUntil).getTime()) {
    const remainingTime = Math.ceil(
      (new Date(user.blockUntil).getTime() - Date.now()) / 1000,
    );
    return next(
      new Error(
        `Too many attempts. Please try again after ${remainingTime} seconds.`,
        { cause: 429 },
      ),
    );
  }

  if (user.isConfirmed) {
    return next(new Error("Email is already confirmed", { cause: 400 }));
  }

  if (Date.now() > new Date(user.otpExpiresAt).getTime()) {
    return next(new Error("OTP has expired", { cause: 400 }));
  }

  const isValidOTP = comparehash({
    planText: `${code}`,
    valuehash: user.emailOTP,
  });
  if (!isValidOTP) {
    await dbservice.updateOne({
      model: Usermodel,
      data: { $inc: { attemptCount: 1 } },
    });

    if (user.attemptCount + 1 >= 5) {
      const blockUntil = new Date(Date.now() + 2 * 60 * 1000);
      await Usermodel.updateOne({ email }, { blockUntil, attemptCount: 0 });
      return next(
        new Error(
          "Too many attempts. You are temporarily blocked for 2 minutes.",
          { cause: 429 },
        ),
      );
    }

    return next(new Error("Invalid OTP. Please try again.", { cause: 400 }));
  }

  await Usermodel.updateOne(
    { email },
    {
      isConfirmed: true,
      $unset: { emailOTP: 0, otpExpiresAt: 0, attemptCount: 0, blockUntil: 0 },
    },
  );
  const access_Token = generatetoken({
    payload: { id: user._id },
    // signature: user.role === roletypes.Admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
  });

  const refreshToken = generatetoken({
    payload: { id: user._id },
    // signature: user.role === roletypes.Admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: "365d",
  });

  return successresponse(res, "Email confirmed successfully", 200, {
    access_Token,
    refreshToken,
  });
});

export const createAdminUser = asyncHandelr(async (req, res) => {
  const createdBy = req.user.id;
  const {
    name,
    phone,
    email,
    password,
    branch,
    mainGroup,
    subGroup,
    permissions,
  } = req.body;

  if (
    !name ||
    !phone ||
    !password ||
    !email ||
    !Array.isArray(branch) ||
    !Array.isArray(mainGroup) ||
    !Array.isArray(subGroup) ||
    !Array.isArray(permissions)
  ) {
    res.status(400);
    throw new Error(
      "❌ جميع الحقول مطلوبة ويجب أن تكون المجموعات والفروع والصلاحيات في صورة Array",
    );
  }

  const exists = await AdminUserModel.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("❌ هذا الرقم مستخدم بالفعل");
  }

  // ✅ رفع الصورة من req.files.image[0]
  let uploadedImage = null;
  const imageFile = req.files?.image?.[0];
  if (imageFile) {
    const uploaded = await cloud.uploader.upload(imageFile.path, {
      folder: `adminUsers/${createdBy}`,
    });
    uploadedImage = {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  }

  const admin = await AdminUserModel.create({
    name,
    phone,
    email,
    password,
    branch,
    mainGroup,
    subGroup,
    permissions,
    profileImage: uploadedImage,
    createdBy,
  });

  res.status(201).json({
    message: "✅ تم إنشاء الأدمن بنجاح",
    admin: {
      _id: admin._id,
      name: admin.name,
      phone: admin.phone,
      branch: admin.branch,
      email: admin.email,
      profileImage: admin.profileImage,
      permissions: admin.permissions,
    },
  });
});

export const getAllAdminUsers = asyncHandelr(async (req, res) => {
  const createdBy = req.user.id;

  const admins = await AdminUserModel.find({ createdBy })
    .populate("branch", "branchName") // فك اسم الفرع
    .populate("mainGroup", "name") // فك اسم المجموعة الرئيسية
    .populate("subGroup", "name") // فك اسم المجموعة الفرعية
    .populate("permissions", "name description"); // فك الصلاحيات

  res.status(200).json({
    message: "✅ الأدمنات التابعين لك",
    count: admins.length,
    admins,
  });
});

export const deleteAdminUser = asyncHandelr(async (req, res) => {
  const adminId = req.params.id;
  const userId = req.user.id; // صاحب المطعم

  const admin = await AdminUserModel.findOneAndDelete({
    _id: adminId,
    createdBy: userId,
  });

  if (!admin) {
    res.status(404);
    throw new Error("❌ لم يتم العثور على الأدمن أو ليس لديك صلاحية الحذف");
  }

  res.status(200).json({
    message: "✅ تم حذف الأدمن بنجاح",
  });
});

export const updateAdminUser = asyncHandelr(async (req, res) => {
  const adminId = req.params.id;
  const userId = req.user.id;

  const {
    name,
    phone,
    email,
    password,
    branch,
    mainGroup,
    subGroup,
    permissions,
  } = req.body;

  const oldAdmin = await AdminUserModel.findOne({
    _id: adminId,
    createdBy: userId,
  });
  if (!oldAdmin) {
    res.status(404);
    throw new Error("❌ لم يتم العثور على الأدمن أو ليس لديك صلاحية التعديل");
  }

  // دمج الأريهات
  const mergeArray = (oldArray = [], newArray = []) => {
    if (!Array.isArray(newArray)) return oldArray;
    const filtered = oldArray.filter((item) => newArray.includes(item));
    const added = newArray.filter((item) => !filtered.includes(item));
    return [...filtered, ...added];
  };

  const updatedData = {
    name: name || oldAdmin.name,
    phone: phone || oldAdmin.phone,
    email: email || oldAdmin.email,
    password: password || oldAdmin.password,
    branch: mergeArray(oldAdmin.branch, branch),
    mainGroup: mergeArray(oldAdmin.mainGroup, mainGroup),
    subGroup: mergeArray(oldAdmin.subGroup, subGroup),
    permissions: mergeArray(oldAdmin.permissions, permissions),
  };

  // رفع صورة جديدة إن وجدت
  const imageFile = req.files?.image?.[0];
  if (imageFile) {
    const uploaded = await cloud.uploader.upload(imageFile.path, {
      folder: `adminUsers/${userId}`,
    });
    updatedData.profileImage = {
      secure_url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  }

  const updatedAdmin = await AdminUserModel.findOneAndUpdate(
    { _id: adminId, createdBy: userId },
    updatedData,
    { new: true, runValidators: true },
  );

  res.status(200).json({
    message: "✅ تم تحديث بيانات الأدمن بنجاح",
    admin: updatedAdmin,
  });
});

export const deleteAppSettings = asyncHandelr(async (req, res, next) => {
  const settings = await AppSettingsSchema.findOne();

  if (!settings) {
    return next(new Error("❌ لا توجد إعدادات لحذفها", { cause: 404 }));
  }

  await AppSettingsSchema.deleteOne({ _id: settings._id });

  return successresponse(res, "🗑️ تم حذف الإعدادات بنجاح", 200, {
    deleted: true,
  });
});

export const updateSection = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  let { name = {}, description = {} } = req.body;

  // ✅ تحويل النصوص إلى JSON إذا كانت String
  try {
    if (typeof name === "string") name = JSON.parse(name);
    if (typeof description === "string") description = JSON.parse(description);
  } catch {
    return next(
      new Error("خطأ في صيغة JSON للـ name أو description", { cause: 400 }),
    );
  }

  // 🔍 البحث عن القسم والتأكد أن المستخدم هو المنشئ
  const section = await SectionModel.findOne({
    _id: id,
    createdBy: req.user._id,
  });
  if (!section) {
    return next(
      new Error("القسم غير موجود أو ليس لديك صلاحية لتعديله", { cause: 404 }),
    );
  }

  // ✅ التحديث
  if (name && (name.en || name.fr || name.ar)) section.name = name;
  if (description && (description.en || description.fr || description.ar))
    section.description = description;

  await section.save();

  return res.status(200).json({
    message: "✅ تم تحديث القسم بنجاح",
    data: section,
  });
});

export const deleteSection = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;

  // 🔍 البحث عن القسم
  const section = await SectionModel.findOne({
    _id: id,
    createdBy: req.user._id,
  });
  if (!section) {
    return next(
      new Error("القسم غير موجود أو ليس لديك صلاحية لحذفه", { cause: 404 }),
    );
  }

  // 🧹 حذف كل المنتجات التابعة للقسم
  const products = await ProductModell.find({ section: id });

  for (const product of products) {
    // 🗑️ حذف صور المنتج من Cloudinary
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img.public_id) {
          await cloud.uploader.destroy(img.public_id);
        }
      }
    }
  }

  // حذف المنتجات من قاعدة البيانات
  await ProductModell.deleteMany({ section: id });

  // 🔥 حذف القسم نفسه
  await SectionModel.deleteOne({ _id: id });

  return res.status(200).json({
    message: "🗑️ تم حذف القسم وجميع المنتجات التابعة له بنجاح",
  });
});

export const addSection = asyncHandelr(async (req, res, next) => {
  const { supermarketId } = req.params;
  const { name = {}, description = {} } = req.body;

  const user = await Usermodel.findById(req.user._id);
  if (!user) return next(new Error("غير مصرح", { cause: 403 }));

  // تحقق أن السوبر ماركت موجود
  const sm = await SupermarketModel.findById(supermarketId);
  if (!sm) return next(new Error("السوبر ماركت غير موجود", { cause: 404 }));

  // حقل الاسم مطلوب على الأقل بلغة واحدة
  if (!(name.en || name.fr || name.ar)) {
    return next(
      new Error("اسم القسم مطلوب على الأقل بلغة واحدة", { cause: 400 }),
    );
  }

  const section = await SectionModel.create({
    supermarket: sm._id,
    name,
    description,
    createdBy: req.user._id,
  });

  return res.status(201).json({ message: "تم إضافة القسم", data: section });
});

export const addProduct = asyncHandelr(async (req, res, next) => {
  const { sectionId } = req.params;
  let {
    name = {},
    description = {},
    price,
    discount = 0,
    stock = 0,
  } = req.body;

  // ✅ Parse JSON Strings if needed
  try {
    if (typeof name === "string") name = JSON.parse(name);
    if (typeof description === "string") description = JSON.parse(description);
  } catch (err) {
    return next(
      new Error("خطأ في صيغة JSON للـ name أو description", { cause: 400 }),
    );
  }

  // ✅ validate
  if (!price && price !== 0)
    return next(new Error("السعر مطلوب", { cause: 400 }));
  if (!(name.en || name.fr || name.ar)) {
    return next(
      new Error("اسم المنتج مطلوب على الأقل بلغة واحدة", { cause: 400 }),
    );
  }

  // ✅ تحقق أن القسم موجود
  const section = await SectionModel.findById(sectionId);
  if (!section) return next(new Error("القسم غير موجود", { cause: 404 }));

  // ✅ صور المنتج
  const images = [];
  if (req.files?.images) {
    for (const file of req.files.images) {
      const uploaded = await cloud.uploader.upload(file.path, {
        folder: "supermarkets/products",
      });
      images.push({
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      });
    }
  }

  // ✅ إنشاء المنتج
  const product = await ProductModelllll.create({
    supermarket: section.supermarket,
    section: section._id,
    name,
    description,
    images,
    price,
    discount,
    stock,
    createdBy: req.user._id,
  });

  return res.status(201).json({ message: "تم إضافة المنتج", data: product });
});

export const deleteProducts = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;

  const product = await ProductModelllll.findOne({
    _id: id,
    createdBy: req.user._id,
  });
  if (!product) {
    return next(
      new Error("المنتج غير موجود أو ليس لديك صلاحية لحذفه", { cause: 404 }),
    );
  }

  // 🗑️ حذف الصور من Cloudinary لو موجودة
  if (product.images && product.images.length > 0) {
    for (const img of product.images) {
      if (img.public_id) {
        try {
          await cloud.uploader.destroy(img.public_id);
        } catch (err) {
          console.warn("⚠️ فشل حذف صورة من Cloudinary:", img.public_id);
        }
      }
    }
  }

  // 🗑️ حذف المنتج من قاعدة البيانات
  await ProductModelllll.findByIdAndDelete(id);

  return res.status(200).json({ message: "✅ تم حذف المنتج بنجاح" });
});

export const createUserByOwner = asyncHandelr(async (req, res, next) => {
  const { fullName, email, accountType, password } = req.body;
  const ownerId = req.user._id; // الـ Owner داخل بالتوكن

  // ✅ تحقق أن المستخدم الحالي هو Owner
  if (req.user.accountType !== "Owner") {
    return res.status(403).json({
      success: false,
      message: "❌ غير مصرح لك بإنشاء مستخدمين",
    });
  }

  // ✅ تحقق من البيانات الأساسية
  if (!fullName || !email || !accountType) {
    return res.status(400).json({
      success: false,
      message: "❌ يجب إدخال fullName و email و accountType",
    });
  }

  // ✅ تحقق من عدم تكرار البريد
  const checkuser = await dbservice.findOne({
    model: Usermodel,
    filter: { email },
  });

  if (checkuser) {
    return next(
      new Error("❌ البريد الإلكتروني مستخدم من قبل", { cause: 400 }),
    );
  }

  // ✅ تجهيز كلمة المرور
  let finalPassword = password;
  if (!finalPassword) {
    finalPassword = crypto.randomBytes(4).toString("hex"); // باسورد عشوائي 8 حروف
  }

  // ✅ تشفير كلمة المرور
  const hashpassword = await generatehash({ planText: finalPassword });

  // ✅ إنشاء المستخدم
  const newUser = await dbservice.create({
    model: Usermodel,
    data: {
      fullName,
      email,
      accountType,
      password: hashpassword,
      isConfirmed: true, // 👈 Owner بيفعل المستخدم مباشرة
    },
  });

  return res.status(201).json({
    success: true,
    message: "✅ تم إنشاء المستخدم بنجاح",
    data: {
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      accountType: newUser.accountType,
      isConfirmed: newUser.isConfirmed,
      generatedPassword: password ? undefined : finalPassword, // نرجع الباسورد العشوائي فقط لو Owner ما بعتهوش
    },
  });
});

export const getUsersByOwner = asyncHandelr(async (req, res, next) => {
  const ownerId = req.user._id;

  if (req.user.accountType !== "Owner") {
    return res.status(403).json({
      success: false,
      message: "❌ غير مصرح لك بجلب المستخدمين",
    });
  }

  const { accountType } = req.query; // 👈 فلتر من الكويري

  let filter = {
    accountType: { $in: ["Admin", "staff", "manager"] }, // ✅ فقط الثلاثة دول
  };

  if (accountType) {
    filter.accountType = accountType; // لو فيه فلتر من الكويري
  }

  // 🔎 رجع بس الحقول المطلوبة
  const users = await Usermodel.find(filter).select(
    "accountType email role fullName",
  );

  return res.status(200).json({
    success: true,
    message: "✅ تم جلب المستخدمين",
    count: users.length,
    data: users,
  });
});

export const updateUserByOwner = asyncHandelr(async (req, res, next) => {
  const { id } = req.params; // ID المستخدم اللي هيعدله
  const { fullName, email, accountType, password } = req.body;
  const ownerId = req.user._id;

  // ✅ تحقق أن المستخدم الحالي هو Owner
  if (req.user.accountType !== "Owner") {
    return res.status(403).json({
      success: false,
      message: "❌ غير مصرح لك بتعديل بيانات المستخدمين",
    });
  }

  // ✅ ابحث عن المستخدم المطلوب تعديله
  const user = await Usermodel.findById(id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "❌ المستخدم غير موجود",
    });
  }

  // ✅ تحديث الحقول المسموح بها فقط
  if (fullName) user.fullName = fullName;
  if (email) user.email = email;
  if (accountType) user.accountType = accountType;

  if (password) {
    // لو فيه باسورد جديد → تشفيره
    const hashpassword = await generatehash({ planText: password });
    user.password = hashpassword;
  }

  await user.save();

  return res.status(200).json({
    success: true,
    message: "✅ تم تعديل بيانات المستخدم بنجاح",
    data: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      accountType: user.accountType,
    },
  });
});

export const deleteUserByOwner = asyncHandelr(async (req, res, next) => {
  const { userId } = req.params; // 👈 ID المستخدم المراد حذفه
  const ownerId = req.user._id; // 👈 الـ Owner داخل بالتوكن

  // ✅ تحقق أن المستخدم الحالي هو Owner
  if (req.user.accountType !== "Owner") {
    return res.status(403).json({
      success: false,
      message: "❌ غير مصرح لك بحذف مستخدمين",
    });
  }

  // ✅ ابحث عن المستخدم
  const user = await dbservice.findOne({
    model: Usermodel,
    filter: { _id: userId },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "❌ المستخدم غير موجود",
    });
  }

  // ✅ نحذف المستخدم
  await dbservice.deleteOne({
    model: Usermodel,
    filter: { _id: userId },
  });

  return res.status(200).json({
    success: true,
    message: "✅ تم حذف المستخدم بنجاح",
    data: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      accountType: user.accountType,
    },
  });
});

const geocoder = NodeGeocoder({
  provider: "openstreetmap",
});

const getCoordinates = async (link) => {
  try {
    // 1️⃣ لو فيه q=lat,long في الرابط
    const regex = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match = link.match(regex);
    if (match) {
      return {
        latitude: parseFloat(match[1]),
        longitude: parseFloat(match[2]),
      };
    }

    // 2️⃣ لو الرابط short link (maps.app.goo.gl) → نفكه
    if (link.includes("maps.app.goo.gl")) {
      const response = await fetch(link, { redirect: "follow" });
      const finalUrl = response.url;

      // جرّب regex تاني بعد الفك
      const match2 = finalUrl.match(regex);
      if (match2) {
        return {
          latitude: parseFloat(match2[1]),
          longitude: parseFloat(match2[2]),
        };
      }

      // 3️⃣ fallback geocode
      const geo = await geocoder.geocode(finalUrl);
      if (geo?.length) {
        return { latitude: geo[0].latitude, longitude: geo[0].longitude };
      }
    } else {
      // 4️⃣ لو لينك عادي → geocode
      const geo = await geocoder.geocode(link);
      if (geo?.length) {
        return { latitude: geo[0].latitude, longitude: geo[0].longitude };
      }
    }
  } catch (err) {
    console.error("❌ خطأ أثناء استخراج الإحداثيات:", err.message);
  }
  return { latitude: null, longitude: null };
};

export const uploadImages = asyncHandelr(async (req, res, next) => {
  const { title } = req.body;
  const userId = req.user._id;

  if (!req.files || req.files.length === 0) {
    return next(new Error("❌ يجب رفع صورة واحدة على الأقل", { cause: 400 }));
  }

  // ⬆️ رفع كل الصور إلى Cloudinary
  const uploadedImages = [];
  for (const file of req.files) {
    const result = await cloud.uploader.upload(file.path, {
      resource_type: "image",
      folder: "uploads/multi",
    });
    uploadedImages.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
    fs.unlinkSync(file.path); // حذف الصورة المحلية بعد الرفع
  }

  // 💾 حفظ البيانات في قاعدة البيانات
  const newImages = await ImageModel.create({
    userId,
    title,
    images: uploadedImages,
  });

  res.status(201).json({
    success: true,
    message: "✅ تم رفع الصور بنجاح",
    data: newImages,
  });
});

export const deleteMyAccount = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id; // جاي من التوكن

  // 🧩 تحقق أن المستخدم موجود
  const user = await Usermodel.findById(userId);
  if (!user) {
    return next(new Error("❌ المستخدم غير موجود", { cause: 404 }));
  }

  // ⚙️ حذف المستخدم
  await Usermodel.findByIdAndDelete(userId);

  // 💬 ممكن كمان تحذف البيانات المرتبطة بالمستخدم هنا (لو فيه Posts أو Orders ...)
  // await OrderModel.deleteMany({ userId });

  return successresponse(res, "✅ تم حذف الحساب بنجاح", 200);
});

export const deleteUserByAdmin = asyncHandelr(async (req, res, next) => {
  const ownerId = req.user._id; // جاي من التوكن
  const { userId } = req.params;

  // ✅ جلب بيانات المالك
  const owner = await Usermodel.findById(ownerId);
  if (!owner) {
    return next(new Error("❌ المستخدم غير موجود", { cause: 404 }));
  }

  // ✅ السماح فقط للـ Owner أو Admin بالحذف
  if (!["Owner"].includes(owner.accountType)) {
    return next(new Error("🚫 لا تملك صلاحية لحذف المستخدمين", { cause: 403 }));
  }

  // ✅ التحقق من وجود المستخدم المطلوب حذفه
  const userToDelete = await Usermodel.findById(userId);
  if (!userToDelete) {
    return next(new Error("❌ المستخدم المطلوب غير موجود", { cause: 404 }));
  }

  // ⚠️ منع المالك أو الأدمن من حذف نفسه
  if (userToDelete._id.toString() === ownerId.toString()) {
    return next(new Error("⚠️ لا يمكنك حذف حسابك بنفسك", { cause: 400 }));
  }

  // ⚙️ حذف المستخدم
  await Usermodel.findByIdAndDelete(userId);

  // 💬 حذف بياناته المرتبطة (اختياري)
  // await OrderModel.deleteMany({ user: userId });
  // await PostModel.deleteMany({ author: userId });

  return successresponse(
    res,
    `✅ تم حذف المستخدم (${userToDelete.fullName || "بدون اسم"}) بنجاح`,
    200,
  );
});

export const getAllImages = asyncHandelr(async (req, res, next) => {
  const images = await ImageModel.find().populate();
  res.status(200).json({
    success: true,
    count: images.length,
    data: images,
  });
});

export const getNotificationsByUser = asyncHandelr(async (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    return next(new Error("❌ يجب إرسال معرف المستخدم userId", { cause: 400 }));
  }

  // 🔍 جلب الإشعارات الخاصة بالمستخدم فقط
  const notifications = await NotificationModell.find({ user: userId })
    .select("title body isRead createdAt")
    .sort({ createdAt: -1 }); // الأحدث أولاً

  // ✅ تنسيق الريسبونس بالشكل المطلوب
  return res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

const uploadToCloud = async (file, folder) => {
  const isPDF = file.mimetype === "application/pdf";

  const uploaded = await cloud.uploader.upload(file.path, {
    folder,
    resource_type: isPDF ? "raw" : "auto",
  });

  return {
    secure_url: uploaded.secure_url,
    public_id: uploaded.public_id,
  };
};
