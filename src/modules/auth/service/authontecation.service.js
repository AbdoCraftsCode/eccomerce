import Usermodel, {
  providerTypes,
  roletypes,
} from "../../../DB/models/User.model.js";
import * as dbservice from "../../../DB/dbservice.js";
import { asyncHandelr } from "../../../utlis/response/error.response.js";
import {
  comparehash,
  generatehash,
} from "../../../utlis/security/hash.security.js";
import { successresponse } from "../../../utlis/response/success.response.js";
import {
  decodedToken,
  generatetoken,
  tokenTypes,
} from "../../../utlis/security/Token.security.js";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import OtpModel from "../../../DB/models/otp.model.js";
import { nanoid, customAlphabet } from "nanoid";
import { vervicaionemailtemplet } from "../../../utlis/temblete/vervication.email.js";
import { sendemail } from "../../../utlis/email/sendemail.js";
import AppSettingsSchema from "../../../DB/models/AppSettingsSchema.js";
import { sendOTP } from "../../../utlis/authentica/authenticaHelper.js"
import { CategoryModellll } from "../../../DB/models/categorySchemaaa.js";
const AUTHENTICA_OTP_URL = "https://api.authentica.sa/api/v1/send-otp";
import { convertProductPrices } from "./changeCurrencyHelper.service.js";
import cloud from "../../../utlis/multer/cloudinary.js";
import fs from "fs";


export const login = asyncHandelr(async (req, res, next) => {
  const { phone, password } = req.body; // تسجيل الدخول فقط برقم الهاتف
  console.log(phone, password);

  if (!phone) {
    return next(new Error("يرجى إدخال رقم الهاتف", { cause: 400 }));
  }

  // ✅ البحث عن المستخدم حسب رقم الهاتف فقط
  const checkUser = await Usermodel.findOne({ phone });

  if (!checkUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  // ✅ لو المستخدم staff أو manager → تسجيل مباشر بدون تحقق OTP أو شروط إضافية
  if (
    checkUser.accountType === "staff" ||
    checkUser.accountType === "manager"
  ) {
    if (!comparehash({ planText: password, valuehash: checkUser.password })) {
      return next(new Error("Password is incorrect", { cause: 404 }));
    }

    const access_Token = generatetoken({
      payload: { id: checkUser._id },
    });

    const refreshToken = generatetoken({
      payload: { id: checkUser._id },
      expiresIn: "365d",
    });

    return successresponse(
      res,
      "✅ Staff or Manager logged in successfully",
      200,
      {
        access_Token,
        refreshToken,
        checkUser,
      },
    );
  }

  if (checkUser?.provider === providerTypes.google) {
    return next(new Error("Invalid account", { cause: 404 }));
  }

  // ✅ تحقق من حالة التأكيد
  if (!checkUser.isConfirmed) {
    try {
      if (checkUser.phone) {
        // ✅ إرسال OTP للهاتف
        await sendOTP(checkUser.phone);
        console.log(`📩 OTP تم إرساله إلى الهاتف: ${checkUser.phone}`);
      }

      return successresponse(
        res,
        "الحساب غير مفعل، تم إرسال رمز التحقق من جديد",
        200,
        { status: "notverified" },
      );
    } catch (error) {
      console.error("❌ فشل في إرسال OTP أثناء تسجيل الدخول:", error.message);
      return next(new Error("فشل في إرسال رمز التحقق", { cause: 500 }));
    }
  }

  // ✅ التحقق من كلمة المرور
  if (!comparehash({ planText: password, valuehash: checkUser.password })) {
    return next(new Error("Password is incorrect", { cause: 404 }));
  }

  // ✅ إنشاء التوكنات
  const access_Token = generatetoken({
    payload: { id: checkUser._id },
  });

  const refreshToken = generatetoken({
    payload: { id: checkUser._id },
    expiresIn: "365d",
  });

  return successresponse(res, "Done", 200, {
    access_Token,
    refreshToken,
    checkUser,
  });
});

export const loginAdmin = asyncHandelr(async (req, res, next) => {
  const { identifier, password } = req.body; // identifier يمكن أن يكون إيميل أو رقم هاتف
  console.log(identifier, password);

  const checkUser = await Usermodel.findOne({
    $or: [{ email: identifier }, { phone: identifier }],
  });

  if (!checkUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (checkUser?.provider === providerTypes.google) {
    return next(new Error("Invalid account", { cause: 404 }));
  }

  if (!checkUser.isConfirmed) {
    return next(new Error("Please confirm your email tmm ", { cause: 404 }));
  }

  // 🔒 شرط السماح بالدخول فقط لـ Owner أو Admin
  if (!["Owner", "Admin"].includes(checkUser.accountType)) {
    return next(new Error("غير مسموح لك بتسجيل الدخول", { cause: 403 }));
  }

  if (!comparehash({ planText: password, valuehash: checkUser.password })) {
    return next(new Error("Password is incorrect", { cause: 404 }));
  }

  const access_Token = generatetoken({
    payload: { id: checkUser._id },
  });

  const refreshToken = generatetoken({
    payload: { id: checkUser._id },
    expiresIn: "365d",
  });

  return successresponse(res, "Done", 200, {
    access_Token,
    refreshToken,
    checkUser,
  });
});


export const refreshToken = asyncHandelr(async (req, res, next) => {
  const user = await decodedToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.refresh,
  });

  const accessToken = generatetoken({
    payload: { id: user._id },
    // signature: user.role === 'Admin' ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
  });

  // 7. إنشاء refresh token جديد
  const newRefreshToken = generatetoken({
    payload: { id: user._id },
    // signature: user.role === 'Admin' ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: "365d", // سنة واحدة
  });

  // 8. إرجاع الرد الناجح
  return successresponse(res, "Token refreshed successfully", 200, {
    accessToken,
    refreshToken: newRefreshToken,
  });
});




export const resendOTP = asyncHandelr(async (req, res, next) => {
  const { email } = req.body;
  console.log(email);

  const checkUser = await Usermodel.findOne({ email });
  if (!checkUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (checkUser.otpExpiresAt && checkUser.otpExpiresAt > Date.now()) {
    return next(
      new Error("Please wait before requesting a new code", { cause: 429 }),
    );
  }

  const otp = customAlphabet("0123456789", 6)();
  const forgetpasswordOTP = generatehash({ planText: otp });

  const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

  await Usermodel.updateOne(
    { email },
    {
      forgetpasswordOTP,
      otpExpiresAt,
      attemptCount: 0,
    },
  );

  const html = vervicaionemailtemplet({ code: otp });
  await sendemail({ to: email, subject: "Resend OTP", html });

  console.log("OTP resent successfully!");
  return successresponse(res, "A new OTP has been sent to your email.");
});


const AUTHENTICA_API_KEY = "ad5348edf3msh15d5daec987b64cp183e9fjsne1092498134c";
const AUTHENTICA_BASE_URL = "https://authentica1.p.rapidapi.com/api/v2";
export async function verifyOTP(phone, otp) {
  try {
    const response = await axios.post(
      `${AUTHENTICA_BASE_URL}/verify-otp`,
      {
        phone: phone,
        otp: otp,
      },
      {
        headers: {
          "x-rapidapi-key": AUTHENTICA_API_KEY,
          "x-rapidapi-host": "authentica1.p.rapidapi.com",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("✅ OTP Verified:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "❌ OTP Verification Failed:",
      error.response?.data || error.message,
    );
    throw error;
  }
}



export const confirOtp = asyncHandelr(async (req, res, next) => {
  const { code, phone } = req.body;

  if (!code || !phone) {
    return next(new Error("يرجى إدخال الكود ورقم الهاتف", { cause: 400 }));
  }

  const baseFilter = { phone };

  // ✅ تحقق عن طريق الهاتف فقط
  const user = await dbservice.findOne({
    model: Usermodel,
    filter: baseFilter,
  });

  if (!user) return next(new Error("رقم الهاتف غير مسجل", { cause: 404 }));

  if (user.isConfirmed) {
    return successresponse(res, "✅ رقم الهاتف تم تأكيده مسبقًا", 200, {
      user,
    });
  }

  try {
    const response = await axios.post(
      "https://authentica1.p.rapidapi.com/api/v2/verify-otp",
      { phone, otp: code },
      {
        headers: {
          "x-rapidapi-key": process.env.AUTHENTICA_API_KEY,
          "x-rapidapi-host": "authentica1.p.rapidapi.com",
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("📩 AUTHENTICA response:", response.data);

    if (
      response.data?.status === true ||
      response.data?.message === "OTP verified successfully"
    ) {
      await dbservice.updateOne({
        model: Usermodel,
        filter: { _id: user._id },
        data: { isConfirmed: true },
      });

      const access_Token = generatetoken({ payload: { id: user._id } });
      const refreshToken = generatetoken({
        payload: { id: user._id },
        expiresIn: "365d",
      });

      return successresponse(res, "✅ تم التحقق من رقم الهاتف بنجاح", 200, {
        access_Token,
        refreshToken,
        user,
      });
    } else {
      return next(new Error("❌ كود التحقق غير صحيح", { cause: 400 }));
    }
  } catch (error) {
    console.error(
      "❌ AUTHENTICA Error:",
      error.response?.data || error.message,
    );
    return next(new Error("❌ فشل التحقق من OTP عبر الهاتف", { cause: 500 }));
  }
});

export const forgetPasswordphone = asyncHandelr(async (req, res, next) => {
  const { phone } = req.body;
  console.log(phone);

  if (!phone) {
    return next(new Error("❌ يجب إدخال رقم الهاتف", { cause: 400 }));
  }

  // 🔍 البحث عن المستخدم باستخدام رقم الهاتف
  const checkUser = await Usermodel.findOne({ mobileNumber: phone });
  if (!checkUser) {
    return next(new Error("❌ رقم الهاتف غير مسجل", { cause: 404 }));
  }

  // 🔹 إرسال OTP عبر Authentica
  try {
    const response = await axios.post(
      AUTHENTICA_OTP_URL,
      {
        phone: phone,
        method: "whatsapp", // أو "sms" حسب الحاجة
        number_of_digits: 6,
        otp_format: "numeric",
        is_fallback_on: 0,
      },
      {
        headers: {
          "X-Authorization": AUTHENTICA_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("✅ OTP تم إرساله بنجاح:", response.data);

    return res.json({
      success: true,
      message: "✅ OTP تم إرساله إلى رقم الهاتف بنجاح",
    });
  } catch (error) {
    console.error(
      "❌ فشل في إرسال OTP:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      error: "❌ فشل في إرسال OTP",
      details: error.response?.data || error.message,
    });
  }
});

export const forgetPasswordphoneadmin = asyncHandelr(async (req, res, next) => {
  const { phone } = req.body;
  console.log(phone);

  if (!phone) {
    return next(new Error("❌ يجب إدخال رقم الهاتف", { cause: 400 }));
  }

  // 🔍 البحث عن المستخدم باستخدام رقم الهاتف
  const checkUser = await Usermodel.findOne({ mobileNumber: phone });
  if (!checkUser) {
    return next(new Error("❌ رقم الهاتف غير مسجل", { cause: 404 }));
  }

  // ✅ السماح فقط للمستخدمين من نوع Owner أو Admin
  const allowedRoles = ["Owner", "Admin"];
  if (!allowedRoles.includes(checkUser.role)) {
    return next(
      new Error("❌ هذا الحساب غير مصرح له بإعادة تعيين كلمة المرور", {
        cause: 403,
      }),
    );
  }

  // 🔹 إرسال OTP عبر Authentica
  try {
    const response = await axios.post(
      AUTHENTICA_OTP_URL,
      {
        phone: phone,
        method: "whatsapp", // أو "sms" حسب الحاجة
        number_of_digits: 6,
        otp_format: "numeric",
        is_fallback_on: 0,
      },
      {
        headers: {
          "X-Authorization": AUTHENTICA_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("✅ OTP تم إرساله بنجاح:", response.data);

    return res.json({
      success: true,
      message: "✅ OTP تم إرساله إلى رقم الهاتف بنجاح",
    });
  } catch (error) {
    console.error(
      "❌ فشل في إرسال OTP:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      error: "❌ فشل في إرسال OTP",
      details: error.response?.data || error.message,
    });
  }
});

export const resetPasswordphone = asyncHandelr(async (req, res, next) => {
  const { phone, password, otp } = req.body;

  if (!phone || !password || !otp) {
    return next(
      new Error("❌ جميع الحقول مطلوبة: رقم الهاتف، كلمة المرور، والـ OTP", {
        cause: 400,
      }),
    );
  }

  const user = await Usermodel.findOne({ mobileNumber: phone });
  if (!user) {
    return next(new Error("❌ المستخدم غير موجود", { cause: 404 }));
  }

  try {
    const response = await axios.post(
      "https://api.authentica.sa/api/v1/verify-otp",
      { phone, otp },
      {
        headers: {
          "X-Authorization": process.env.AUTHENTICA_API_KEY,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    console.log("📩 استجابة API:", response.data);

    if (
      response.data.status === true &&
      response.data.message === "OTP verified successfully"
    ) {
      const hashpassword = generatehash({ planText: password });

      await Usermodel.updateOne(
        { mobileNumber: phone },
        {
          password: hashpassword,
          isConfirmed: true,
          changeCredentialTime: Date.now(),
        },
      );

      return successresponse(res, "✅ تم إعادة تعيين كلمة المرور بنجاح", 200);
    } else {
      return next(new Error("❌ OTP غير صحيح", { cause: 400 }));
    }
  } catch (error) {
    console.error(
      "❌ فشل التحقق من OTP:",
      error.response?.data || error.message,
    );
    return res.status(500).json({
      success: false,
      error: "❌ فشل التحقق من OTP",
      details: error.response?.data || error.message,
    });
  }
});

export const loginwithGmail = asyncHandelr(async (req, res, next) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    return next(new Error("Access token is required", { cause: 400 }));
  }

  // Step 1: Get user info from Google
  let userInfo;
  try {
    const response = await axios.get(
      "https://www.googleapis.com/oauth2/v3/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    userInfo = response.data;
  } catch (error) {
    console.error(
      "Failed to fetch user info from Google:",
      error?.response?.data || error.message,
    );
    return next(
      new Error("Failed to verify access token with Google", { cause: 401 }),
    );
  }

  const { email, name, picture, email_verified } = userInfo;

  if (!email) {
    return next(
      new Error("Email is missing in Google response", { cause: 400 }),
    );
  }
  if (!email_verified) {
    return next(new Error("Email not verified", { cause: 403 }));
  }

  let user = await dbservice.findOne({
    model: Usermodel,
    filter: { email },
  });

  if (user?.provider === providerTypes.system) {
    return next(
      new Error("Invalid account. Please login using your email/password", {
        cause: 403,
      }),
    );
  }

  if (!user) {
    let userId;
    let isUnique = false;
    while (!isUnique) {
      userId = Math.floor(1000000 + Math.random() * 9000000);
      const existingUser = await dbservice.findOne({
        model: Usermodel,
        filter: { userId },
      });
      if (!existingUser) isUnique = true;
    }

    user = await dbservice.create({
      model: Usermodel,
      data: {
        email,
        username: name,
        profilePic: { secure_url: picture },
        isConfirmed: email_verified,
        provider: providerTypes.google,
        userId, // ✅ Add generated userId here
        gender: "Male", // لو تقدر تجيبه من جوجل أو تخليه undefined
      },
    });
  }

  // Step 4: Generate tokens
  const access_Token = generatetoken({
    payload: { id: user._id, country: user.country },
  });

  const refreshToken = generatetoken({
    payload: { id: user._id },
    expiresIn: "365d",
  });

  return successresponse(res, "Done", 200, {
    access_Token,
    refreshToken,
    user,
  });
});

export const deleteMyAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await Usermodel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "❌ لم يتم العثور على الحساب." });
    }

    // تنفيذ الحذف
    await Usermodel.findByIdAndDelete(userId);

    res.status(200).json({
      message: "✅ تم حذف حسابك بنجاح.",
      deletedUserId: userId,
    });
  } catch (err) {
    console.error("❌ Error in deleteMyAccount:", err);
    res.status(500).json({
      message: "❌ حدث خطأ أثناء حذف الحساب.",
      error: err.message,
    });
  }
};

export const loginRestaurant = asyncHandelr(async (req, res, next) => {
  const { email, password } = req.body;
  console.log(email, password);

  // ✅ لازم ترجع كلمة المرور عشان تقدر تقارنها
  const checkUser = await Usermodel.findOne({ email }).select("+password");

  if (!checkUser) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (!checkUser.isConfirmed) {
    return next(new Error("Please confirm your email tmm ", { cause: 404 }));
  }
  // ✅ قارن كلمة المرور المشفرة
  const isMatch = await comparehash({
    planText: password,
    valuehash: checkUser.password,
  });

  if (!isMatch) {
    return next(new Error("Password is incorrect", { cause: 404 }));
  }

  // ✅ توليد Access Token و Refresh Token
  const access_Token = generatetoken({
    payload: { id: checkUser._id },
  });

  const refreshToken = generatetoken({
    payload: { id: checkUser._id },
    expiresIn: "365d",
  });

  const restaurantLink = `https://morezk12.github.io/Restaurant-system/#/restaurant/${checkUser.subdomain}`;

  // ✅ رجع كل بيانات المستخدم + التوكنات
  const allData = {
    message: "Login successful",
    id: checkUser._id,
    fullName: checkUser.fullName,
    email: checkUser.email,
    phone: checkUser.phone,
    country: checkUser.country,
    subdomain: checkUser.subdomain,
    restaurantLink,
    access_Token,
    refreshToken,
  };

  return successresponse(res, allData, 200);
});

export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user._id; // ✅ جاي من التوكن

    // هات بيانات المستخدم من الـ DB مع الحقول اللي محتاجها بس
    const user = await Usermodel.findById(userId).select(
      "fullName email phone totalPoints modelcar serviceType carImages profiePicture isAgree",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "⚠️ المستخدم غير موجود",
      });
    }

    return res.status(200).json({
      success: true,
      message: "✅ تم جلب البروفايل بنجاح",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCompactProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // جلب الحقول المطلوبة بما فيها subscription
    const user = await Usermodel.findById(userId).select(
      "fullName email phone profiePicture subscription",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "⚠️ المستخدم غير موجود",
      });
    }

    const now = new Date();
    const MS_PER_DAY = 1000 * 60 * 60 * 24;

    // نقرأ مباشرة من subscription
    const startDate = user.subscription?.startDate
      ? new Date(user.subscription.startDate)
      : null;
    const endDate = user.subscription?.endDate
      ? new Date(user.subscription.endDate)
      : null;
    const planType = user.subscription?.planType || "FreeTrial";

    // حساب الأيام المتبقية والايام المستخدمة فقط لو موجود start و end
    let daysLeft = 0;
    let daysUsed = 0;

    if (startDate && endDate) {
      const diffLeftMs = endDate.getTime() - now.getTime();
      daysLeft = diffLeftMs > 0 ? Math.ceil(diffLeftMs / MS_PER_DAY) : 0;

      const diffUsedMs = now.getTime() - startDate.getTime();
      daysUsed = diffUsedMs > 0 ? Math.floor(diffUsedMs / MS_PER_DAY) : 0;
    }

    return res.status(200).json({
      success: true,
      message: "✅ تم جلب بيانات البروفايل المختصرة بنجاح",
      data: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profiePicture: user.profiePicture || null,
        planType,
        daysLeft,
        daysUsed,
        startDate,
        endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createOrUpdateSettings = asyncHandelr(async (req, res, next) => {
  const { whatsappNumber, privacyPolicy } = req.body;

  let settings = await AppSettingsSchema.findOne();
  if (!settings) {
    settings = await AppSettingsSchema.create({
      whatsappNumber,
      privacyPolicy,
    });
  } else {
    settings.whatsappNumber = whatsappNumber || settings.whatsappNumber;
    settings.privacyPolicy = privacyPolicy || settings.privacyPolicy;
    await settings.save();
  }

  return successresponse(res, "✅ تم حفظ الإعدادات بنجاح", 200, { settings });
});

export const getSettings = asyncHandelr(async (req, res, next) => {
  const settings = await AppSettingsSchema.findOne();
  return successresponse(res, "✅ تم جلب الإعدادات بنجاح", 200, { settings });
});

export const getAppSettingsAdmin = asyncHandelr(async (req, res, next) => {
  // 🔍 جلب الإعدادات من قاعدة البيانات
  const settings = await AppSettingsSchema.find();

  // ✅ إذا ما فيش إعدادات، نرجع مصفوفة فاضية
  if (!settings || settings.length === 0) {
    return successresponse(res, "ℹ️ لا توجد إعدادات حالياً", 200, {
      settings: [],
    });
  }

  // ✅ إرجاع البيانات في شكل Array
  return successresponse(res, "✅ تم جلب الإعدادات بنجاح", 200, { settings });
});

// Category

import slugify from "slugify";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { BrandModel } from "../../../DB/models/brandSchemaaa.js";
import { AttributeModell } from "../../../DB/models/attributeSchemaaa.js";
import { AttributeValueModel } from "../../../DB/models/attributeValueSchema.js";
import { CouponModel } from "../../../DB/models/couponSchemaaa.js";
import { OrderModelUser } from "../../../DB/models/orderSchemaUser.model.js";

export const createCategory = asyncHandelr(async (req, res, next) => {
  const { name, parentCategory, description, status } = req.body;


  if (!name?.ar || !name?.en) {
    return next(
      new Error("❌ اسم القسم مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  const slug = slugify(name.en, {
    lower: true,
    strict: true,
  });

  // ✅ Check uniqueness
  const exists = await CategoryModellll.findOne({ slug });
  if (exists) {
    return next(new Error("❌ اسم القسم موجود بالفعل", { cause: 409 }));
  }

  // ✅ رفع الصور (أكثر من صورة)
  let images = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const { secure_url } = await cloud.uploader.upload(file.path, {
        folder: "categories",
      });
      images.push(secure_url);
      fs.unlinkSync(file.path);
    }
  }

  // ✅ Create
  const category = await CategoryModellll.create({
    name,
    slug,
    parentCategory: parentCategory || null,
    images, // الصور
    description, // الوصف (ar / en)
    status, // الحالة (published | inactive | scheduled)
  });

  res.status(201).json({
    success: true,
    message: " تم إنشاء القسم بنجاح",
    data: category,
  });
});

export const getCategories = asyncHandelr(async (req, res, next) => {
  // ✅ جلب كل الأقسام المفعلة مع populate للأب
  const categories = await CategoryModellll.find({ isActive: true })
    .populate("parentCategory", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  // ✅ جلب إحصائيات المنتجات لكل قسم (بما فيه الفرعيات)
  const categoryStats = await ProductModellll.aggregate([
    {
      $match: {
        isActive: true,
        status: "published", // اختياري: بس المنشورة
      },
    },
    { $unwind: "$categories" },
    {
      $group: {
        _id: "$categories",
        productCount: { $sum: 1 },
        totalPrice: {
          $sum: {
            $cond: [
              { $regexMatch: { input: "$mainPrice", regex: /^\d+(\.\d+)?$/ } },
              { $toDouble: "$mainPrice" },
              0,
            ],
          },
        },
      },
    },
  ]);

  // map: categoryId → { productCount, totalPrice }
  const statsMap = {};
  categoryStats.forEach((stat) => {
    statsMap[stat._id.toString()] = {
      productCount: stat.productCount || 0,
      totalPrice: stat.totalPrice || 0,
    };
  });

  // ✅ دالة لحساب كل subcategories المتداخلة (للحساب التراكمي)
  const getAllSubCategoryIds = (catId, allCats) => {
    const directChildren = allCats.filter(
      (c) =>
        c.parentCategory &&
        c.parentCategory._id.toString() === catId.toString(),
    );
    let subs = directChildren.map((c) => c._id.toString());
    for (const child of directChildren) {
      subs = subs.concat(getAllSubCategoryIds(child._id.toString(), allCats));
    }
    return subs;
  };

  // ✅ دالة لحساب الإحصائيات التراكمية لقسم (هو + كل أبنائه)
  const getCategoryStats = (catId, allCats) => {
    const subIds = getAllSubCategoryIds(catId, allCats);
    const allIds = [catId, ...subIds];

    let productCount = 0;
    let totalPrice = 0;

    allIds.forEach((id) => {
      const s = statsMap[id];
      if (s) {
        productCount += s.productCount;
        totalPrice += s.totalPrice;
      }
    });

    return { productCount, totalPrice };
  };

  // ✅ بناء الشجرة مع الإحصائيات
  const buildTree = (parentId = null) => {
    return categories
      .filter((c) => {
        if (parentId === null) return !c.parentCategory;
        return (
          c.parentCategory &&
          c.parentCategory._id.toString() === parentId.toString()
        );
      })
      .map((cat) => {
        const catId = cat._id.toString();
        const stats = getCategoryStats(catId, categories);

        const children = buildTree(catId);

        return {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          images: cat.images || [],
          description: cat.description || {},
          comment: cat.comment || {},
          status: cat.status,
          parentCategory: cat.parentCategory,
          productCount: stats.productCount,
          totalPrice: stats.totalPrice,
          children: children.length > 0 ? children : [],
        };
      });
  };

  const tree = buildTree();

  // ✅ حساب الإحصائيات العامة
  const mainCategories = categories.filter((c) => !c.parentCategory);
  const subCategories = categories.filter((c) => c.parentCategory);

  const stats = {
    totalMainCategories: mainCategories.length,
    totalSubCategories: subCategories.length,
    totalCategories: categories.length,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب شجرة الأقسام مع الإحصائيات بنجاح ",
    stats,
    data: tree,
  });
});

export const getCategoryTreeById = asyncHandelr(async (req, res, next) => {
  const { categoryId } = req.params;

  // التحقق من وجود categoryId
  if (!categoryId) {
    return next(new Error("❌ معرف القسم مطلوب", { cause: 400 }));
  }

  // جلب كل الأقسام المفعلة (نفس الطريقة القديمة)
  const categories = await CategoryModellll.find({ isActive: true })
    .populate("parentCategory", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  if (categories.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لا توجد أقسام حاليًا",
      stats: {
        totalMainCategories: 0,
        totalSubCategories: 0,
        totalCategories: 0,
      },
      data: null,
    });
  }

  // التحقق من وجود القسم المطلوب
  const targetCategory = categories.find(
    (c) => c._id.toString() === categoryId,
  );
  if (!targetCategory) {
    return next(new Error("❌ القسم غير موجود أو غير مفعل", { cause: 404 }));
  }

  // جلب إحصائيات المنتجات (نفس الطريقة)
  const categoryStats = await ProductModellll.aggregate([
    {
      $match: {
        isActive: true,
        status: "published",
      },
    },
    { $unwind: "$categories" },
    {
      $group: {
        _id: "$categories",
        productCount: { $sum: 1 },
        totalPrice: {
          $sum: {
            $cond: [
              { $regexMatch: { input: "$mainPrice", regex: /^\d+(\.\d+)?$/ } },
              { $toDouble: "$mainPrice" },
              0,
            ],
          },
        },
      },
    },
  ]);

  const statsMap = {};
  categoryStats.forEach((stat) => {
    statsMap[stat._id.toString()] = {
      productCount: stat.productCount || 0,
      totalPrice: stat.totalPrice || 0,
    };
  });

  // دالة لحساب كل subcategories المتداخلة
  const getAllSubCategoryIds = (catId, allCats) => {
    const directChildren = allCats.filter(
      (c) =>
        c.parentCategory &&
        c.parentCategory._id.toString() === catId.toString(),
    );
    let subs = directChildren.map((c) => c._id.toString());
    for (const child of directChildren) {
      subs = subs.concat(getAllSubCategoryIds(child._id.toString(), allCats));
    }
    return subs;
  };

  // دالة لحساب الإحصائيات التراكمية
  const getCategoryStats = (catId, allCats) => {
    const subIds = getAllSubCategoryIds(catId, allCats);
    const allIds = [catId, ...subIds];

    let productCount = 0;
    let totalPrice = 0;

    allIds.forEach((id) => {
      const s = statsMap[id];
      if (s) {
        productCount += s.productCount;
        totalPrice += s.totalPrice;
      }
    });

    return { productCount, totalPrice };
  };

  // بناء الشجرة بداية من القسم المطلوب
  const buildSubTree = (catId) => {
    const cat = categories.find((c) => c._id.toString() === catId);
    if (!cat) return null;

    const stats = getCategoryStats(catId, categories);
    const children = categories
      .filter(
        (c) => c.parentCategory && c.parentCategory._id.toString() === catId,
      )
      .map((child) => buildSubTree(child._id.toString()))
      .filter(Boolean);

    return {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      images: cat.images || [],
      description: cat.description || {},
      comment: cat.comment || {},
      status: cat.status,
      parentCategory: cat.parentCategory,
      productCount: stats.productCount,
      totalPrice: stats.totalPrice,
      children: children.length > 0 ? children : [],
    };
  };

  const tree = buildSubTree(categoryId);

  // حساب الإحصائيات العامة (للقسم وفرعياته فقط)
  const allSubIds = getAllSubCategoryIds(categoryId, categories);
  const allIdsInTree = [categoryId, ...allSubIds];

  const mainInTree = allIdsInTree.filter(
    (id) =>
      !categories.find(
        (c) => c.parentCategory && c.parentCategory._id.toString() === id,
      ),
  ).length;

  const subInTree = allIdsInTree.length - mainInTree;

  const stats = {
    totalMainCategories: tree.parentCategory ? 0 : 1, // لو القسم رئيسي → 1، غير كده 0
    totalSubCategories: subInTree,
    totalCategories: allIdsInTree.length,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب شجرة القسم مع الفرعيات والإحصائيات بنجاح ✅",
    stats,
    data: tree,
  });
});

export const updateCategory = asyncHandelr(async (req, res, next) => {
  const { categoryId } = req.params;
  const { name, parentCategory, description, status, comment } = req.body;

  const category = await CategoryModellll.findById(categoryId);
  if (!category) {
    return next(new Error("❌ القسم غير موجود", { cause: 404 }));
  }

  // تعديل الاسم
  if (name?.en || name?.ar) {
    category.name.ar = name?.ar || category.name.ar;
    category.name.en = name?.en || category.name.en;

    // إعادة توليد slug لو الاسم الإنجليزي اتغير
    if (name?.en) {
      const newSlug = slugify(name.en, { lower: true, strict: true });

      const slugExists = await CategoryModellll.findOne({
        slug: newSlug,
        _id: { $ne: categoryId },
      });

      if (slugExists) {
        return next(new Error("❌ اسم القسم موجود بالفعل", { cause: 409 }));
      }

      category.slug = newSlug;
    }
  }

  // تعديل القسم الأب
  if (parentCategory !== undefined) {
    category.parentCategory = parentCategory || null;
  }

  // تعديل الوصف
  if (description) {
    category.description.ar = description?.ar || category.description.ar;
    category.description.en = description?.en || category.description.en;
  }

  if (comment) {
    category.comment.ar = comment?.ar || category.comment.ar;
    category.comment.en = comment?.en || category.comment.en;
  }

  // تعديل الحالة
  if (status) {
    if (!["published", "inactive", "scheduled"].includes(status)) {
      return next(new Error("❌ الحالة غير صحيحة", { cause: 400 }));
    }
    category.status = status;
  }

  // تعديل الصور (لو تم إرسال ملفات جديدة)
  if (req.files && req.files.length > 0) {
    const images = [];
    for (const file of req.files) {
      const { secure_url } = await cloud.uploader.upload(file.path, {
        folder: "categories",
      });
      images.push(secure_url);
      fs.unlinkSync(file.path);
    }
    category.images = images; // استبدال الصور القديمة بالجديدة
  }

  await category.save();

  res.status(200).json({
    success: true,
    message: " تم تعديل القسم بنجاح",
    data: category,
  });
});

export const deleteCategory = asyncHandelr(async (req, res, next) => {
  const { categoryId } = req.params;

  const category = await CategoryModellll.findById(categoryId);
  if (!category) {
    return next(new Error("❌ القسم غير موجود", { cause: 404 }));
  }

  category.isActive = false;
  await category.save();

  res.status(200).json({
    success: true,
    message: " تم حذف القسم بنجاح",
  });
});

export const CreateProdut = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من وجود توكن ومستخدم مسجل دخول
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لإنشاء منتج", { cause: 401 }));
  }

  // ✅ التحقق من أن المستخدم بائع (vendor)
  if (req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بإنشاء منتجات", { cause: 403 }));
  }

  // ✅ التأكد من أن البائع مقبول (اختياري للأمان الإضافي)
  if (req.user.status !== "ACCEPTED") {
    return next(
      new Error("❌ طلب الانضمام كبائع لم يُقبل بعد", { cause: 403 }),
    );
  }

  const {
    name,
    description,
    categories,
    weight,
    brands,
    stock,
    seo,
    sku,
    mainPrice,
    disCountPrice,
    tax,
    bulkDiscounts,
    currency,
    hasVariants,
    inStock,
    unlimitedStock,
    tags = [],
    status,
  } = req.body;

  // Validations أساسية (نفس اللي عندك بدون تغيير)
  if (!name?.ar || !name?.en) {
    return next(
      new Error("❌ اسم المنتج مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return next(new Error("❌ يجب اختيار قسم واحد على الأقل", { cause: 400 }));
  }

  if (!req.files || req.files.length === 0) {
    return next(new Error("❌ يجب رفع صورة واحدة على الأقل", { cause: 400 }));
  }

  // التحقق من وجود الأقسام
  const categoriesCount = await CategoryModellll.countDocuments({
    _id: { $in: categories },
    isActive: true,
  });
  if (categoriesCount !== categories.length) {
    return next(
      new Error("❌ قسم أو أكثر غير موجود أو غير مفعل", { cause: 400 }),
    );
  }

  // التحقق من SKU إذا كان موجود (unique)
  if (sku) {
    const existingSku = await ProductModellll.findOne({ sku });
    if (existingSku) {
      return next(new Error("❌ هذا SKU مستخدم من قبل", { cause: 409 }));
    }
  }

  // رفع الصور إلى Cloudinary
  const images = [];
  for (const file of req.files) {
    const result = await cloud.uploader.upload(file.path, {
      folder: "products",
    });
    images.push(result.secure_url);
    fs.unlinkSync(file.path); // حذف الملف المؤقت
  }

  // إنشاء Slug للـ SEO
  const seoSlug = slugify(seo?.slug || name.en, { lower: true, strict: true });
  const slugExists = await ProductModellll.findOne({ "seo.slug": seoSlug });
  if (slugExists) {
    return next(
      new Error("❌ هذا الـ slug مستخدم بالفعل، اختر اسم آخر", { cause: 409 }),
    );
  }

  // إنشاء المنتج مع createdBy
  const product = await ProductModellll.create({
    name,
    description,
    categories,
    brands,
    images,
    sku: sku?.trim() || undefined,
    mainPrice,
    disCountPrice,
    tax: {
      enabled: tax?.enabled || false,
      rate: tax?.rate || 0,
    },
    bulkDiscounts: bulkDiscounts || [],
    currency,
    weight,
    stock,
    hasVariants,
    inStock,
    unlimitedStock,
    tags: tags.map((tag) => tag.toLowerCase().trim()),
    status,
    seo: {
      title: seo?.title || name.en,
      description: seo?.description || description?.en || "",
      slug: seoSlug,
    },
    rating: {
      average: 0,
      count: 0,
    },
    isActive: true,
    createdBy: req.user._id, // ← هنا التوكن بيشتغل (مين اللي أنشأ المنتج)
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء المنتج بنجاح ✅",
    data: product,
  });
});

export const getProducts = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من وجود توكن
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لعرض المنتجات", { cause: 401 }));
  }

  const isVendor = req.user.accountType === "vendor";
  const isAdminOrOwner = ["Admin", "Owner"].includes(req.user.accountType);

  if (!isVendor && !isAdminOrOwner) {
    return next(new Error("❌ غير مصرح لك بعرض المنتجات", { cause: 403 }));
  }

  const {
    stock,
    category,
    status,
    page = 1,
    limit = 10,
    search, // ← فلتر جديد: بحث بالاسم أو الـ SKU
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // ✅ بناء الفلتر الأساسي
  let filter = {};

  // إضافة فلتر createdBy لو بائع
  if (isVendor) {
    filter.createdBy = req.user._id;
  }

  // فلترة حسب status
  if (status) {
    const validStatuses = ["published", "inactive", "scheduled"];
    if (!validStatuses.includes(status)) {
      return next(
        new Error(
          "قيمة status غير صحيحة. استخدم: published, inactive, scheduled",
          { cause: 400 },
        ),
      );
    }
    filter.status = status;
  } else {
    filter.status = "published";
  }

  // فلترة حسب القسم + subcategories
  if (category) {
    const mainCat = await CategoryModellll.findById(category);
    if (!mainCat || !mainCat.isActive) {
      return next(new Error("القسم غير موجود أو غير مفعل", { cause: 404 }));
    }

    const getAllSubCategoryIds = async (catId) => {
      const children = await CategoryModellll.find({
        parentCategory: catId,
        isActive: true,
      }).select("_id");

      let subs = [];
      for (const child of children) {
        subs.push(child._id);
        subs.push(...(await getAllSubCategoryIds(child._id)));
      }
      return subs;
    };

    const subCategoryIds = await getAllSubCategoryIds(category);
    const allCategoryIds = [category, ...subCategoryIds];
    filter.categories = { $in: allCategoryIds };
  }

  // ✅ فلتر البحث الجديد (بالاسم أو الـ SKU)
  if (search) {
    const searchTerm = search.trim();
    const searchRegex = new RegExp(searchTerm, "i"); // بحث غير حساس لحالة الحروف

    filter.$or = [
      { "name.ar": searchRegex },
      { "name.en": searchRegex },
      { sku: searchRegex },
    ];
  }

  // ✅ جلب المنتجات مع الفلترة والـ pagination
  let productsQuery = ProductModellll.find(filter)
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug images description comment status parentCategory",
      populate: {
        path: "parentCategory",
        match: { isActive: true },
        select: "name slug",
      },
    })
    .select("-__v")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalProducts = await ProductModellll.countDocuments(filter);

  let products = await productsQuery.lean();

  // باقي الكود زي ما هو بالضبط (stock، variant، summary، pagination، children)
  // ... (كل الكود من variantStockMap لحد الـ res.json)

  // ✅ جلب stock الكلي من الـ variants
  const productsWithVariants = products
    .filter((p) => p.hasVariants)
    .map((p) => p._id);
  let variantStockMap = {};
  if (productsWithVariants.length > 0) {
    const variantStocks = await VariantModel.aggregate([
      { $match: { productId: { $in: productsWithVariants }, isActive: true } },
      {
        $group: {
          _id: "$productId",
          totalVariantStock: { $sum: "$stock" },
          variantCount: { $sum: 1 },
        },
      },
    ]);
    variantStocks.forEach((v) => {
      variantStockMap[v._id.toString()] = {
        total: v.totalVariantStock || 0,
        count: v.variantCount || 0,
      };
    });
  }

  // دالة حساب stockStatus
  const calculateStockStatus = (product) => {
    if (!product.isActive || product.status !== "published") {
      return {
        status: "غير نشط",
        total: 0,
        available: 0,
        lowStock: 0,
        outOfStock: 0,
        inactive: 1,
      };
    }
    if (product.unlimitedStock) {
      return {
        status: "متوفر في المخزون",
        total: 999999,
        available: 1,
        lowStock: 0,
        outOfStock: 0,
        inactive: 0,
      };
    }
    let effectiveStock = product.stock || 0;
    if (product.hasVariants) {
      effectiveStock = variantStockMap[product._id.toString()]?.total || 0;
    }
    let statusText = "نفد من المخزون";
    if (effectiveStock > 10) statusText = "متوفر في المخزون";
    else if (effectiveStock > 0) statusText = "قارب على النفاد";
    return {
      status: statusText,
      total: effectiveStock,
      available: effectiveStock > 10 ? 1 : 0,
      lowStock: effectiveStock > 0 && effectiveStock <= 10 ? 1 : 0,
      outOfStock: effectiveStock === 0 ? 1 : 0,
      inactive: 0,
    };
  };

  products = products.map((product) => ({
    ...product,
    stockStatus: calculateStockStatus(product),
    ...(product.hasVariants && variantStockMap[product._id.toString()]
      ? {
          variantInfo: {
            totalVariants: variantStockMap[product._id.toString()].count,
            totalVariantStock: variantStockMap[product._id.toString()].total,
          },
        }
      : {}),
  }));

  if (stock) {
    const validStocks = ["available", "low", "out", "inactive"];
    if (!validStocks.includes(stock)) {
      return next(
        new Error(
          "قيمة stock غير صحيحة. استخدم: available, low, out, inactive",
          { cause: 400 },
        ),
      );
    }
    const statusMap = {
      available: "متوفر في المخزون",
      low: "قارب على النفاد",
      out: "نفد من المخزون",
      inactive: "غير نشط",
    };
    products = products.filter(
      (p) => p.stockStatus.status === statusMap[stock],
    );
  }

  const categoryIds = products.flatMap((p) =>
    p.categories.map((c) => c._id.toString()),
  );
  let childrenMap = {};
  if (categoryIds.length > 0) {
    const children = await CategoryModellll.find({
      parentCategory: { $in: categoryIds },
      isActive: true,
    })
      .select("name slug parentCategory")
      .lean();
    children.forEach((child) => {
      const parentId = child.parentCategory.toString();
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push({
        _id: child._id,
        name: child.name,
        slug: child.slug,
      });
    });
  }
  products.forEach((product) => {
    product.categories.forEach((category) => {
      category.children = childrenMap[category._id.toString()] || [];
    });
  });

  const summary = {
    totalProducts: products.length,
    available: products.filter(
      (p) => p.stockStatus.status === "متوفر في المخزون",
    ).length,
    lowStock: products.filter((p) => p.stockStatus.status === "قارب على النفاد")
      .length,
    outOfStock: products.filter(
      (p) => p.stockStatus.status === "نفد من المخزون",
    ).length,
    inactive: products.filter((p) => p.stockStatus.status === "غير نشط").length,
  };

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum),
    totalItems: totalProducts,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalProducts / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب المنتجات بنجاح ",
    count: products.length,
    summary,
    pagination,
    data: products,
  });
});

export const GetProductById = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;

  // ✅ التحقق من وجود توكن
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لعرض المنتج", { cause: 401 }));
  }

  const isVendor = req.user.accountType === "vendor";
  const isAdminOrOwner = ["Admin", "Owner"].includes(req.user.accountType);

  if (!isVendor && !isAdminOrOwner) {
    return next(new Error("❌ غير مصرح لك بعرض المنتجات", { cause: 403 }));
  }

  // ✅ فلتر أساسي
  let filter = { _id: productId };

  // لو بائع → لازم يكون المنتج تابع له
  if (isVendor) {
    filter.createdBy = req.user._id;
  }

  // جلب المنتج مع populate
  const product = await ProductModellll.findOne(filter)
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug images description comment status parentCategory",
      populate: {
        path: "parentCategory",
        match: { isActive: true },
        select: "name slug",
      },
    })
    .select("-__v")
    .lean();

  if (!product) {
    return next(
      new Error("❌ المنتج غير موجود أو غير متاح لك", { cause: 404 }),
    );
  }

  // ✅ حساب stock من الـ variants لو موجودة
  let variantInfo = null;
  let effectiveStock = product.stock || 0;

  if (product.hasVariants) {
    const variantStock = await VariantModel.aggregate([
      { $match: { productId: product._id, isActive: true } },
      {
        $group: {
          _id: null,
          totalVariantStock: { $sum: "$stock" },
          variantCount: { $sum: 1 },
        },
      },
    ]);

    if (variantStock.length > 0) {
      effectiveStock = variantStock[0].totalVariantStock || 0;
      variantInfo = {
        totalVariants: variantStock[0].variantCount,
        totalVariantStock: variantStock[0].totalVariantStock,
      };
    }
  }

  // ✅ حساب stockStatus
  const calculateStockStatus = (prod) => {
    if (!prod.isActive || prod.status !== "published") {
      return { status: "غير نشط", total: 0 };
    }
    if (prod.unlimitedStock) {
      return { status: "متوفر في المخزون", total: 999999 };
    }
    let statusText = "نفد من المخزون";
    if (effectiveStock > 10) statusText = "متوفر في المخزون";
    else if (effectiveStock > 0) statusText = "قارب على النفاد";
    return { status: statusText, total: effectiveStock };
  };

  const stockStatus = calculateStockStatus(product);

  // ✅ إضافة children للأقسام
  const categoryIds = product.categories.map((c) => c._id.toString());
  let childrenMap = {};

  if (categoryIds.length > 0) {
    const children = await CategoryModellll.find({
      parentCategory: { $in: categoryIds },
      isActive: true,
    })
      .select("name slug parentCategory")
      .lean();

    children.forEach((child) => {
      const parentId = child.parentCategory.toString();
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push({
        _id: child._id,
        name: child.name,
        slug: child.slug,
      });
    });
  }

  product.categories.forEach((category) => {
    category.children = childrenMap[category._id.toString()] || [];
  });

  // ✅ إضافة الحقول الجديدة
  const formattedProduct = {
    ...product,
    stockStatus,
    ...(product.hasVariants ? { variantInfo } : {}),
  };

  res.status(200).json({
    success: true,
    message: "تم جلب المنتج بنجاح ✅",
    data: formattedProduct,
  });
});

export const UpdateProduct = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;

  const {
    name,
    description,
    categories,
    seo,
    status,
    sku,
    mainPrice,
    disCountPrice,
    currency,
    tax,
    inStock,
    unlimitedStock,
    stock,
    weight,
    tags,
    bulkDiscounts,
    hasVariants,
    isActive,
  } = req.body;

  const product = await ProductModellll.findById(productId);
  if (!product) {
    return next(new Error("❌ المنتج غير موجود", { cause: 404 }));
  }

  // دالة مساعدة لتحويل string أو boolean إلى boolean صحيح
  const toBoolean = (value) => value === true || value === "true";

  // ✅ تعديل الاسم + slug
  if (name) {
    if (name.ar) product.name.ar = name.ar.trim();
    if (name.en) {
      product.name.en = name.en.trim();

      const newSlug = slugify(name.en, { lower: true, strict: true });
      const slugExists = await ProductModellll.findOne({
        "seo.slug": newSlug,
        _id: { $ne: productId },
      });
      if (slugExists) {
        return next(
          new Error("❌ هذا الـ slug مستخدم في منتج آخر", { cause: 409 }),
        );
      }
      product.seo.slug = newSlug;
      if (!seo?.title) product.seo.title = name.en;
    }
  }

  // ✅ تعديل الوصف
  if (description) {
    if (description.ar) product.description.ar = description.ar.trim();
    if (description.en) product.description.en = description.en.trim();
  }

  // ✅ تعديل الأقسام
  if (categories && Array.isArray(categories) && categories.length > 0) {
    const categoriesCount = await CategoryModellll.countDocuments({
      _id: { $in: categories },
      isActive: true,
    });
    if (categoriesCount !== categories.length) {
      return next(
        new Error("❌ قسم أو أكثر غير موجود أو غير مفعل", { cause: 400 }),
      );
    }
    product.categories = categories;
  }

  // ✅ تعديل الحقول البسيطة
  if (status) product.status = status;

  if (sku !== undefined) {
    if (sku.trim() === "") {
      product.sku = undefined;
    } else {
      const skuExists = await ProductModellll.findOne({
        sku: sku.trim(),
        _id: { $ne: productId },
      });
      if (skuExists)
        return next(new Error("❌ هذا SKU مستخدم في منتج آخر", { cause: 409 }));
      product.sku = sku.trim();
    }
  }

  if (mainPrice !== undefined) product.mainPrice = mainPrice;
  if (disCountPrice !== undefined) product.disCountPrice = disCountPrice;
  if (weight !== undefined) product.weight = weight;
  if (currency) product.currency = currency;

  // ✅ تعديل الحقول البوليانية (التصحيح النهائي)
  if (hasVariants !== undefined) product.hasVariants = toBoolean(hasVariants);
  if (isActive !== undefined) product.isActive = toBoolean(isActive);
  if (inStock !== undefined) product.inStock = toBoolean(inStock);
  if (unlimitedStock !== undefined)
    product.unlimitedStock = toBoolean(unlimitedStock);

  // ✅ تعديل المخزون
  if (stock !== undefined) product.stock = Math.max(0, Number(stock) || 0);

  // ✅ تعديل الضريبة
  if (tax) {
    if (tax.enabled !== undefined) product.tax.enabled = toBoolean(tax.enabled);
    if (tax.rate !== undefined)
      product.tax.rate = Math.max(0, Number(tax.rate) || 0);
  }

  // ✅ تعديل الـ tags
  if (tags && Array.isArray(tags)) {
    product.tags = tags.map((tag) => tag.toLowerCase().trim()).filter(Boolean);
  }

  // ✅ تعديل bulkDiscounts
  if (bulkDiscounts && Array.isArray(bulkDiscounts)) {
    product.bulkDiscounts = bulkDiscounts.map((d) => ({
      minQty: Number(d.minQty),
      maxQty: Number(d.maxQty),
      discountPercent: Math.min(100, Math.max(1, Number(d.discountPercent))),
    }));
  }

  // ✅ تعديل SEO
  if (seo) {
    if (seo.title) product.seo.title = seo.title.trim();
    if (seo.description) product.seo.description = seo.description.trim();
  }

  // ✅ تحديث الصور (إضافة جديدة)
  if (req.files && req.files.length > 0) {
    const newImages = [];
    for (const file of req.files) {
      const result = await cloud.uploader.upload(file.path, {
        folder: "products",
      });
      newImages.push(result.secure_url);
      fs.unlinkSync(file.path);
    }
    product.images = [...product.images, ...newImages];
  }

  // ✅ حذف صور معينة
  if (req.body.removeImages) {
    let imagesToRemove;
    try {
      imagesToRemove = JSON.parse(req.body.removeImages);
    } catch (e) {
      return next(new Error("❌ صيغة removeImages غير صحيحة", { cause: 400 }));
    }

    if (Array.isArray(imagesToRemove)) {
      product.images = product.images.filter(
        (img) => !imagesToRemove.includes(img),
      );
    }
  }

  await product.save();

  res.status(200).json({
    success: true,
    message: "تم تعديل المنتج بنجاح ✅",
    data: product,
  });
});

export const DeleteProduct = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;

  // ✅ تحقق من وجود productId
  if (!productId) {
    return next(new Error("❌ معرف المنتج مطلوب", { cause: 400 }));
  }

  const product = await ProductModellll.findById(productId);

  if (!product) {
    return next(new Error("❌ المنتج غير موجود", { cause: 404 }));
  }

  // ✅ Soft Delete
  product.isActive = false;
  await product.save();

  res.status(200).json({
    success: true,
    message: "تم حذف المنتج بنجاح (تم إلغاء تفعيله) ✅",
    data: {
      productId: product._id,
      isActive: product.isActive,
    },
  });
});

export const createVariant = asyncHandelr(async (req, res, next) => {
  const { productId, attributes, price, stock, sku, disCountPrice, weight } =
    req.body;

  // ✅ Validation أساسية
  if (!productId) {
    return next(new Error("❌ productId مطلوب", { cause: 400 }));
  }

  if (!price || isNaN(price) || Number(price) <= 0) {
    return next(
      new Error("❌ السعر مطلوب ويجب أن يكون رقم موجب", { cause: 400 }),
    );
  }

  if (!disCountPrice || isNaN(disCountPrice) || Number(disCountPrice) <= 0) {
    return next(
      new Error("❌ السعر مطلوب ويجب أن يكون رقم موجب", { cause: 400 }),
    );
  }

  if (
    stock === undefined ||
    stock === null ||
    isNaN(stock) ||
    Number(stock) < 0
  ) {
    return next(
      new Error("❌ المخزون مطلوب ويجب أن يكون رقم غير سالب", { cause: 400 }),
    );
  }

  if (!req.files || req.files.length === 0) {
    return next(
      new Error("❌ يجب رفع صورة واحدة على الأقل للمتغير", { cause: 400 }),
    );
  }

  // ✅ تحويل attributes من string إلى array إذا كان جاي كـ JSON string (شائع في form-data)
  let parsedAttributes = [];
  try {
    if (typeof attributes === "string") {
      parsedAttributes = JSON.parse(attributes);
    } else if (Array.isArray(attributes)) {
      parsedAttributes = attributes;
    } else {
      return next(new Error("❌ صيغة attributes غير صحيحة", { cause: 400 }));
    }

    if (!Array.isArray(parsedAttributes) || parsedAttributes.length === 0) {
      return next(
        new Error("❌ يجب اختيار متغير واحد على الأقل (attribute)", {
          cause: 400,
        }),
      );
    }
  } catch (error) {
    return next(
      new Error("❌ صيغة JSON للـ attributes غير صحيحة", { cause: 400 }),
    );
  }

  // ✅ تأكد إن المنتج موجود ومفعل ويدعم المتغيرات
  const product = await ProductModellll.findById(productId);
  if (!product) {
    return next(new Error("❌ المنتج غير موجود", { cause: 404 }));
  }
  if (!product.isActive) {
    return next(new Error("❌ المنتج غير مفعل", { cause: 400 }));
  }
  if (!product.hasVariants) {
    return next(
      new Error("❌ هذا المنتج لا يدعم المتغيرات (hasVariants = false)", {
        cause: 400,
      }),
    );
  }

  // ✅ التحقق من صحة الـ attributeId و valueId
  for (const attr of parsedAttributes) {
    if (!attr.attributeId || !attr.valueId) {
      return next(
        new Error("❌ كل متغير يجب أن يحتوي على attributeId و valueId", {
          cause: 400,
        }),
      );
    }

    // تحقق من وجود الـ Attribute والـ Value وأنهم مفعلين
    const attribute = await AttributeModell.findOne({
      _id: attr.attributeId,
      isActive: true,
    });
    if (!attribute) {
      return next(
        new Error(
          `❌ الخاصية (Attribute) غير موجودة أو غير مفعلة: ${attr.attributeId}`,
          { cause: 400 },
        ),
      );
    }

    const value = await AttributeValueModel.findOne({
      _id: attr.valueId,
      attributeId: attr.attributeId,
      isActive: true,
    });
    if (!value) {
      return next(
        new Error(
          `❌ القيمة (Value) غير موجودة أو غير مطابقة للخاصية: ${attr.valueId}`,
          { cause: 400 },
        ),
      );
    }
  }

  // ✅ رفع الصور إلى Cloudinary
  const images = [];
  for (const file of req.files) {
    const result = await cloud.uploader.upload(file.path, {
      folder: "variants",
    });
    images.push({
      url: result.secure_url,
      public_id: result.public_id,
    });
    fs.unlinkSync(file.path); // حذف الملف المؤقت
  }

  // ✅ إنشاء المتغير
  const variant = await VariantModel.create({
    productId,
    attributes: parsedAttributes.map((attr) => ({
      attributeId: attr.attributeId,
      valueId: attr.valueId,
    })),
    price: Number(price),
    stock: Number(stock),
    sku,
    weight,
    disCountPrice: Number(disCountPrice),
    images,
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء المتغير بنجاح ",
    data: variant,
  });
});

export const getVariants = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;

  // ✅ التحقق من وجود المنتج أولاً
  const product = await ProductModellll.findById(productId);
  if (!product) {
    return next(new Error("❌ المنتج غير موجود", { cause: 404 }));
  }

  if (!product.hasVariants) {
    return res.status(200).json({
      success: true,
      message: "هذا المنتج لا يحتوي على متغيرات",
      count: 0,
      data: [],
    });
  }

  // ✅ جلب المتغيرات مع populate كامل للـ attributes والـ values
  const variants = await VariantModel.find({
    productId,
    isActive: true,
  })
    .populate({
      path: "attributes.attributeId",
      match: { isActive: true },
      select: "name type",
    })
    .populate({
      path: "attributes.valueId",
      match: { isActive: true },
      select: "value hexCode",
    })
    .sort({ createdAt: -1 })
    .lean(); // عشان نقدر نعدل عليها بسهولة

  // ✅ تنظيف وتحسين شكل الـ attributes للـ frontend
  const formattedVariants = variants.map((variant) => {
    // فلترة أي attribute فشل في الـ populate (لو attribute أو value محذوفة أو غير مفعلة)
    const validAttributes = variant.attributes.filter(
      (attr) => attr.attributeId && attr.valueId,
    );

    // تحويل إلى شكل أوضح: array من objects مع كل التفاصيل
    const attributes = validAttributes.map((attr) => ({
      name: attr.attributeId.name, // { ar: "اللون", en: "Color" }
      type: attr.attributeId.type, // مثلاً "color" أو "select"
      value: attr.valueId.value, // { ar: "أحمر", en: "Red" }
      hexCode: attr.valueId.hexCode || null,
    }));

    // أو لو عايز شكل object بدل array (أسهل للـ frontend أحيانًا)
    // const attributesObj = validAttributes.reduce((obj, attr) => {
    //     obj[attr.attributeId.name.en.toLowerCase()] = {
    //         name: attr.attributeId.name,
    //         value: attr.valueId.value,
    //         hexCode: attr.valueId.hexCode || null
    //     };
    //     return obj;
    // }, {});

    return {
      _id: variant._id,
      price: variant.price,
      stock: variant.stock,
      sku: variant.sku,
      disCountPrice: variant.disCountPrice,
      finalPrice: variant.finalPrice,
      images: variant.images,
      weight: variant.weight,
      isActive: variant.isActive,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
      attributes, // أو attributesObj لو عايز object
    };
  });

  res.status(200).json({
    success: true,
    message: "تم جلب المتغيرات بنجاح ",
    count: formattedVariants.length,
    data: formattedVariants,
  });
});

export const updateVariant = asyncHandelr(async (req, res, next) => {
  const { variantId } = req.params;
  const { attributes, price, stock, isActive, sku, disCountPrice } = req.body;

  const variant = await VariantModel.findById(variantId);
  if (!variant) {
    return next(new Error("❌ المتغير غير موجود", { cause: 404 }));
  }

  // ✅ تحديث الـ attributes (يجب أن تكون array من { attributeId, valueId })
  if (attributes) {
    let parsedAttributes;
    try {
      if (typeof attributes === "string") {
        parsedAttributes = JSON.parse(attributes);
      } else if (Array.isArray(attributes)) {
        parsedAttributes = attributes;
      } else {
        return next(new Error("❌ صيغة attributes غير صحيحة", { cause: 400 }));
      }

      if (!Array.isArray(parsedAttributes) || parsedAttributes.length === 0) {
        return next(
          new Error("❌ يجب إرسال متغير واحد على الأقل (attribute)", {
            cause: 400,
          }),
        );
      }

      // التحقق الأساسي من البنية
      for (const attr of parsedAttributes) {
        if (!attr.attributeId || !attr.valueId) {
          return next(
            new Error(
              "❌ كل attribute يجب أن يحتوي على attributeId و valueId",
              { cause: 400 },
            ),
          );
        }
      }

      // التحقق من وجود الـ attribute و value وأنهم مفعلين (اختياري للأمان)
      for (const attr of parsedAttributes) {
        const attribute = await AttributeModell.findOne({
          _id: attr.attributeId,
          isActive: true,
        });
        if (!attribute) {
          return next(
            new Error(
              `❌ الخاصية غير موجودة أو غير مفعلة: ${attr.attributeId}`,
              { cause: 400 },
            ),
          );
        }

        const value = await AttributeValueModel.findOne({
          _id: attr.valueId,
          attributeId: attr.attributeId,
          isActive: true,
        });
        if (!value) {
          return next(
            new Error(`❌ القيمة غير موجودة أو غير مطابقة: ${attr.valueId}`, {
              cause: 400,
            }),
          );
        }
      }

      variant.attributes = parsedAttributes.map((attr) => ({
        attributeId: attr.attributeId,
        valueId: attr.valueId,
      }));
    } catch (error) {
      return next(
        new Error("❌ صيغة JSON للـ attributes غير صحيحة", { cause: 400 }),
      );
    }
  }

  // ✅ تحديث الحقول البسيطة
  // ✅ تحديث الحقول البسيطة
  if (price !== undefined) {
    if (isNaN(price) || Number(price) <= 0) {
      return next(new Error("❌ السعر يجب أن يكون رقم موجب", { cause: 400 }));
    }
    variant.price = Number(price);
  }

  if (stock !== undefined) {
    if (isNaN(stock) || Number(stock) < 0) {
      return next(
        new Error("❌ المخزون يجب أن يكون رقم غير سالب", { cause: 400 }),
      );
    }
    variant.stock = Number(stock);
  }

  if (isActive !== undefined) {
    variant.isActive = !!isActive;
  }

  // ✅ إضافة: تحديث SKU مع التحقق من التكرار
  if (sku !== undefined) {
    if (sku.trim() === "") {
      variant.sku = undefined;
    } else {
      const skuExists = await VariantModel.findOne({
        sku: sku.trim(),
        _id: { $ne: variantId },
      });
      if (skuExists) {
        return next(
          new Error("❌ هذا SKU مستخدم في متغير آخر", { cause: 409 }),
        );
      }
      variant.sku = sku.trim();
    }
  }

  // ✅ إضافة: تحديث disCountPrice
  if (disCountPrice !== undefined) {
    variant.disCountPrice = disCountPrice.trim() || null;
  }

  // ✅ تحديث الصور (استبدال كامل: حذف القديمة + رفع الجديدة)
  if (req.files && req.files.length > 0) {
    // حذف الصور القديمة من Cloudinary
    for (const img of variant.images) {
      if (img.public_id) {
        await cloud.uploader.destroy(img.public_id);
      }
    }

    // رفع الصور الجديدة
    const newImages = [];
    for (const file of req.files) {
      const result = await cloud.uploader.upload(file.path, {
        folder: "variants",
      });
      newImages.push({
        url: result.secure_url,
        public_id: result.public_id,
      });
      fs.unlinkSync(file.path); // حذف الملف المؤقت
    }

    variant.images = newImages;
  }

  await variant.save();

  // ✅ جلب الـ variant بعد التحديث مع populate كامل (زي الـ getVariants)
  const updatedVariant = await VariantModel.findById(variantId)
    .populate({
      path: "attributes.attributeId",
      match: { isActive: true },
      select: "name type",
    })
    .populate({
      path: "attributes.valueId",
      match: { isActive: true },
      select: "value hexCode",
    })
    .lean();

  // تنسيق الـ attributes للـ frontend
  const validAttributes = updatedVariant.attributes.filter(
    (attr) => attr.attributeId && attr.valueId,
  );

  const formattedAttributes = validAttributes.map((attr) => ({
    name: attr.attributeId.name,
    type: attr.attributeId.type,
    value: attr.valueId.value,
    hexCode: attr.valueId.hexCode || null,
  }));

  const responseData = {
    _id: updatedVariant._id,
    productId: updatedVariant.productId,
    price: updatedVariant.price,
    sku: updatedVariant.sku,
    disCountPrice: updatedVariant.disCountPrice,
    stock: updatedVariant.stock,
    images: updatedVariant.images,
    isActive: updatedVariant.isActive,
    createdAt: updatedVariant.createdAt,
    updatedAt: updatedVariant.updatedAt,
    attributes: formattedAttributes,
  };

  res.status(200).json({
    success: true,
    message: "تم تعديل المتغير بنجاح ",
    data: responseData,
  });
});

export const deleteVariant = asyncHandelr(async (req, res, next) => {
  const { variantId } = req.params;

  const variant = await VariantModel.findById(variantId);
  if (!variant) return next(new Error("❌ المتغير غير موجود", { cause: 404 }));

  variant.isActive = false;
  await variant.save();

  res.status(200).json({
    success: true,
    message: " تم حذف المتغير بنجاح",
  });
});

export const filterProducts = asyncHandelr(async (req, res, next) => {
  const {
    lang = "en",
    page = 1,
    limit = 10,
    color, // مثال: "أحمر" أو "Red"
    size, // مثال: "42" أو "M"
  } = req.query;

  // تأمين الـ pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let matchingValueIds = [];

  if (color || size) {
    // جلب الـ AttributeValues المطابقة للـ color أو size
    let valueFilter = { isActive: true };

    if (color || size) {
      const orConditions = [];

      if (color) {
        orConditions.push({ [`value.${lang}`]: color }, { "value.en": color });
      }
      if (size) {
        orConditions.push({ [`value.${lang}`]: size }, { "value.en": size });
      }

      if (orConditions.length > 0) {
        valueFilter.$or = orConditions;
      }
    }

    const matchingValues = await AttributeValueModel.find(valueFilter)
      .select("_id")
      .lean();

    if (matchingValues.length === 0) {
      return res.status(200).json({
        success: true,
        message: "لا توجد منتجات مطابقة للفلاتر المطلوبة",
        count: 0,
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limitNum,
          hasNext: false,
          hasPrev: false,
        },
        data: [],
      });
    }

    matchingValueIds = matchingValues.map((v) => v._id);
  }

  // فلتر الـ variants اللي فيها valueId مطابق
  let variantFilter = { isActive: true };
  if (matchingValueIds.length > 0) {
    variantFilter["attributes.valueId"] = { $in: matchingValueIds };
  }

  // جلب الـ variants المطابقة
  const matchingVariants = await VariantModel.find(variantFilter)
    .select("productId")
    .lean();

  if (matchingVariants.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لا توجد منتجات مطابقة للفلاتر",
      count: 0,
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limitNum,
        hasNext: false,
        hasPrev: false,
      },
      data: [],
    });
  }

  // استخراج productIds الفريدة
  const productIds = [
    ...new Set(matchingVariants.map((v) => v.productId.toString())),
  ];

  const totalProducts = productIds.length;

  // pagination على الـ productIds
  const paginatedProductIds = productIds.slice(skip, skip + limitNum);

  // جلب المنتجات
  let products = await ProductModellll.find({
    _id: { $in: paginatedProductIds },
    isActive: true,
    status: "published",
  })
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .populate({
      path: "brands",
      match: { isActive: true },
      select: "name image",
    })
    .select("-__v")
    .lean();

  // جلب كل الـ variants للمنتجات في الصفحة (مش بس المفلترة)
  const productIdsInPage = products.map((p) => p._id);
  let variantsMap = {};

  if (productIdsInPage.length > 0) {
    const allVariants = await VariantModel.find({
      productId: { $in: productIdsInPage },
      isActive: true,
    })
      .populate({
        path: "attributes.attributeId",
        select: "name",
      })
      .populate({
        path: "attributes.valueId",
        select: "value hexCode",
      })
      .lean();

    allVariants.forEach((variant) => {
      if (!variantsMap[variant.productId]) {
        variantsMap[variant.productId] = [];
      }

      const formattedAttributes = variant.attributes
        .filter((attr) => attr.attributeId && attr.valueId)
        .map((attr) => ({
          attributeName:
            attr.attributeId.name[lang] || attr.attributeId.name.en,
          value: attr.valueId.value[lang] || attr.valueId.value.en,
          hexCode: attr.valueId.hexCode || null,
        }));

      variantsMap[variant.productId].push({
        _id: variant._id,
        price: variant.price,
        stock: variant.stock,
        images: variant.images,
        attributes: formattedAttributes,
      });
    });
  }

  // تنسيق المنتجات (نفس GetAllProducts)
  const formattedProducts = products.map((product) => {
    const baseProduct = {
      _id: product._id,
      name: product.name[lang] || product.name.en,
      description: product.description?.[lang] || product.description?.en || "",
      categories: (product.categories || []).map((cat) => ({
        _id: cat._id,
        name: cat.name[lang] || cat.name.en,
        slug: cat.slug,
      })),
      brands: (product.brands || []).map((brand) => ({
        _id: brand._id,
        name: brand.name[lang] || brand.name.en,
        image: brand.image,
      })),
      images: product.images || [],
      mainPrice: product.mainPrice,
      disCountPrice: product.disCountPrice || null,
      currency: product.currency,
      sku: product.sku,
      tax: product.tax,
      rating: product.rating,
      seo: product.seo,
      hasVariants: product.hasVariants,
      inStock: product.inStock,
      unlimitedStock: product.unlimitedStock,
      stock: product.stock || 0,
      tags: product.tags || [],
      bulkDiscounts: product.bulkDiscounts || [],
    };

    return {
      ...baseProduct,
      variants: variantsMap[product._id.toString()] || [],
    };
  });

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum),
    totalItems: totalProducts,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalProducts / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم فلترة المنتجات بنجاح ✅",
    count: formattedProducts.length,
    pagination,
    data: formattedProducts,
  });
});

export const GetAllProducts = asyncHandelr(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const userLanguage = req.user.lang;

  // تحويل وتأمين القيم
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // max 50 للأداء
  const skip = (pageNum - 1) * limitNum;

  // جلب عدد المنتجات الكلي للـ pagination
  const totalProducts = await ProductModellll.countDocuments({
    isActive: true,
    status: "published",
  });

  // جلب المنتجات مع pagination + populate
  let products = await ProductModellll.find({
    isActive: true,
    status: "published",
  })
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .populate({
      path: "brands",
      match: { isActive: true },
      select: "name image",
    })
    .select("-__v")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // جلب الـ variants فقط للمنتجات الموجودة في الصفحة الحالية
  const productIdsWithVariants = products
    .filter((p) => p.hasVariants)
    .map((p) => p._id);

  let variantsMap = {};

  if (productIdsWithVariants.length > 0) {
    const variants = await VariantModel.find({
      productId: { $in: productIdsWithVariants },
      isActive: true,
    })
      .populate({
        path: "attributes.attributeId",
        select: "name",
      })
      .populate({
        path: "attributes.valueId",
        select: "value hexCode",
      })
      .lean();

    variants.forEach((variant) => {
      if (!variantsMap[variant.productId]) {
        variantsMap[variant.productId] = [];
      }

      const formattedAttributes = variant.attributes
        .filter((attr) => attr.attributeId && attr.valueId)
        .map((attr) => ({
          attributeName:
            attr.attributeId.name[userLanguage] || attr.attributeId.name.en,
          value: attr.valueId.value[userLanguage] || attr.valueId.value.en,
          hexCode: attr.valueId.hexCode || null,
        }));

      variantsMap[variant.productId].push({
        _id: variant._id,
        price: variant.price,
        stock: variant.stock,
        images: variant.images,
        attributes: formattedAttributes,
      });
    });
  }

  // تنسيق المنتجات النهائي
  const formattedProducts = products.map((product) => {
    const baseProduct = {
      _id: product._id,
      name: product.name[userLanguage] || product.name.en,
      description:
        product.description?.[userLanguage] || product.description?.en || "",
      categories: (product.categories || []).map((cat) => ({
        _id: cat._id,
        name: cat.name[userLanguage] || cat.name.en,
        slug: cat.slug,
      })),
      brands: (product.brands || []).map((brand) => ({
        _id: brand._id,
        name: brand.name[userLanguage] || brand.name.en,
        image: brand.image,
      })),
      images: product.images || [],
      mainPrice: product.mainPrice,
      disCountPrice: product.disCountPrice || null,
      currency: product.currency,
      sku: product.sku,
      tax: product.tax,
      rating: product.rating,
      seo: product.seo,
      hasVariants: product.hasVariants,
      inStock: product.inStock,
      unlimitedStock: product.unlimitedStock,
      stock: product.stock || 0,
      tags: product.tags || [],
      bulkDiscounts: product.bulkDiscounts || [],
    };

    if (product.hasVariants) {
      return {
        ...baseProduct,
        variants: variantsMap[product._id.toString()] || [],
      };
    } else {
      return {
        ...baseProduct,
        price: product.mainPrice,
        stock: product.unlimitedStock ? "unlimited" : product.stock,
        variants: [],
      };
    }
  });

  // معلومات الـ pagination
  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum),
    totalItems: totalProducts,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalProducts / limitNum),
    hasPrev: pageNum > 1,
  };

  const finalProducts = await convertProductPrices(
    formattedProducts,
    req.user.currency,
  );

  res.status(200).json({
    success: true,
    message: "تم جلب المنتجات بنجاح مع التصفح الصفحي ",
    count: formattedProducts.length,
    pagination,
    data: finalProducts,
  });
});

export const getProductByIdForEndUser = asyncHandelr(async (req, res, next) => {
  const { productId } = req.params;
  const { lang = "en", currency } = req.query;

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return next(new Error("Invalid product ID", { cause: 400 }));
  }

  const product = await ProductModellll.findOne({
    _id: productId,
    isActive: true,
    status: "published",
  })
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .populate({
      path: "brands",
      match: { isActive: true },
      select: "name image",
    })
    .select("-__v")
    .lean();

  if (!product) {
    return next(new Error("Product not found or inactive", { cause: 404 }));
  }

  let variants = [];
  if (product.hasVariants) {
    const productVariants = await VariantModel.find({
      productId: product._id,
      isActive: true,
    })
      .populate({
        path: "attributes.attributeId",
        select: "name",
      })
      .populate({
        path: "attributes.valueId",
        select: "value hexCode",
      })
      .lean();

    variants = productVariants.map((variant) => {
      const formattedAttributes = variant.attributes
        .filter((attr) => attr.attributeId && attr.valueId)
        .map((attr) => ({
          attributeName:
            attr.attributeId.name[lang] || attr.attributeId.name.en,
          value: attr.valueId.value[lang] || attr.valueId.value.en,
          hexCode: attr.valueId.hexCode || null,
        }));

      return {
        _id: variant._id,
        price: variant.price,
        disCountPrice: variant.disCountPrice || null,
        stock: variant.stock,
        images: variant.images || [],
        attributes: formattedAttributes,
        weight: variant.weight || null,
        sku: variant.sku || null,
      };
    });
  }

  const finalPrice = product.disCountPrice
    ? product.disCountPrice
    : product.mainPrice;

  const formattedProduct = {
    _id: product._id,
    name: product.name[lang] || product.name.en,
    description: product.description?.[lang] || product.description?.en || "",
    categories: (product.categories || []).map((cat) => ({
      _id: cat._id,
      name: cat.name[lang] || cat.name.en,
      slug: cat.slug || "",
    })),
    brands: (product.brands || []).map((brand) => ({
      _id: brand._id,
      name: brand.name[lang] || brand.name.en,
      image: brand.image || null,
    })),
    images: product.images || [],
    mainPrice: product.mainPrice,
    disCountPrice: product.disCountPrice || null,
    finalPrice: finalPrice,
    currency: product.currency || "USD",
    sku: product.sku || null,
    weight: product.weight || null,
    tax: product.tax || { enabled: false, rate: 0 },
    rating: product.rating || { average: 0, count: 0 },
    seo: product.seo || { title: "", description: "", slug: "" },
    hasVariants: product.hasVariants || false,
    inStock: product.inStock !== false,
    unlimitedStock: product.unlimitedStock || false,
    stock: product.unlimitedStock ? "unlimited" : product.stock,
    tags: product.tags || [],
    bulkDiscounts: product.bulkDiscounts || [],
    createdBy: product.createdBy,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    variants: product.hasVariants ? variants : [],

    ...(!product.hasVariants && {
      availableStock: product.unlimitedStock ? "unlimited" : product.stock || 0,
      isInStock:
        product.inStock !== false &&
        (product.unlimitedStock || (product.stock || 0) > 0),
    }),
  };

  let finalProduct = formattedProduct;
  if (currency) {
    const convertedProducts = await convertProductPrices(
      [formattedProduct],
      currency,
    );
    finalProduct = convertedProducts[0];
  }

  res.status(200).json({
    success: true,
    message: "Product details retrieved successfully",
    data: finalProduct,
  });
});

export const getCategoriesLocalized = asyncHandelr(async (req, res, next) => {
  const { lang = "en" } = req.query; // ?lang=ar أو en

  // جلب كل الأقسام المفعلة مع populate للأب
  const categories = await CategoryModellll.find({ isActive: true })
    .populate("parentCategory", "name slug")
    .sort({ createdAt: -1 })
    .lean();

  if (categories.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لا توجد أقسام حاليًا",
      data: [],
    });
  }

  // تنسيق الأقسام مع ترجمة الأسماء
  const formattedCategories = categories.map((cat) => ({
    _id: cat._id.toString(),
    name: cat.name[lang] || cat.name.en,
    slug: cat.slug,
    images: cat.images || [],
    description: cat.description?.[lang] || cat.description?.en || "",
    comment: cat.comment?.[lang] || cat.comment?.en || "",
    status: cat.status,
    parentId: cat.parentCategory ? cat.parentCategory._id.toString() : null,
    parentCategory: cat.parentCategory
      ? {
          _id: cat.parentCategory._id.toString(),
          name: cat.parentCategory.name[lang] || cat.parentCategory.name.en,
          slug: cat.parentCategory.slug,
        }
      : null,
  }));

  // بناء الشجرة الهرمية
  const categoryMap = {};
  const tree = [];

  // أولاً: نحط كل قسم في map عشان الوصول السريع
  formattedCategories.forEach((cat) => {
    categoryMap[cat._id] = {
      ...cat,
      children: [],
    };
  });

  // ثانيًا: نربط الأبناء بالآباء
  formattedCategories.forEach((cat) => {
    if (cat.parentId) {
      // لو ليه أب، نضيفه كـ child عند الأب
      if (categoryMap[cat.parentId]) {
        categoryMap[cat.parentId].children.push(categoryMap[cat._id]);
      }
    } else {
      // لو مفيش أب → قسم رئيسي، نضيفه للشجرة الرئيسية
      tree.push(categoryMap[cat._id]);
    }
  });

  // ترتيب الأبناء داخل كل أب (اختياري: حسب createdAt أو اسم)
  const sortChildren = (node) => {
    if (node.children.length > 0) {
      node.children.sort((a, b) => b.createdAt - a.createdAt); // أحدث الأبناء أولاً
      node.children.forEach(sortChildren);
    }
  };
  tree.forEach(sortChildren);

  res.status(200).json({
    success: true,
    message: "تم جلب شجرة الأقسام بنجاح مع الترجمة ",
    count: tree.length, // عدد الأقسام الرئيسية فقط
    data: tree,
  });
});

export const GetProductsByCategory = asyncHandelr(async (req, res, next) => {
  const { categoryId } = req.params;
  const { lang = "en", page = 1, limit = 10 } = req.query;

  // تأمين الـ pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // التحقق من وجود القسم
  const mainCategory = await CategoryModellll.findById(categoryId);
  if (!mainCategory || !mainCategory.isActive) {
    return next(new Error("❌ القسم غير موجود أو غير مفعل", { cause: 404 }));
  }

  // جلب كل subcategories المتداخلة (تراكمي)
  const getAllSubCategoryIds = async (catId) => {
    const children = await CategoryModellll.find({
      parentCategory: catId,
      isActive: true,
    }).select("_id");

    let subs = children.map((c) => c._id);
    for (const child of children) {
      subs = subs.concat(await getAllSubCategoryIds(child._id));
    }
    return subs;
  };

  const subCategoryIds = await getAllSubCategoryIds(categoryId);
  const allCategoryIds = [categoryId, ...subCategoryIds];

  // فلتر المنتجات اللي في القسم أو أي فرعي منه
  const filter = {
    isActive: true,
    status: "published",
    categories: { $in: allCategoryIds },
  };

  // عدد المنتجات الكلي في القسم (للـ pagination)
  const totalProducts = await ProductModellll.countDocuments(filter);

  // جلب المنتجات مع pagination
  let products = await ProductModellll.find(filter)
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .populate({
      path: "brands",
      match: { isActive: true },
      select: "name image",
    })
    .select("-__v")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  // جلب الـ variants للمنتجات في الصفحة الحالية فقط
  const productIdsWithVariants = products
    .filter((p) => p.hasVariants)
    .map((p) => p._id);

  let variantsMap = {};

  if (productIdsWithVariants.length > 0) {
    const variants = await VariantModel.find({
      productId: { $in: productIdsWithVariants },
      isActive: true,
    })
      .populate({
        path: "attributes.attributeId",
        select: "name",
      })
      .populate({
        path: "attributes.valueId",
        select: "value hexCode",
      })
      .lean();

    variants.forEach((variant) => {
      if (!variantsMap[variant.productId]) {
        variantsMap[variant.productId] = [];
      }

      const formattedAttributes = variant.attributes
        .filter((attr) => attr.attributeId && attr.valueId)
        .map((attr) => ({
          attributeName:
            attr.attributeId.name[lang] || attr.attributeId.name.en,
          value: attr.valueId.value[lang] || attr.valueId.value.en,
          hexCode: attr.valueId.hexCode || null,
        }));

      variantsMap[variant.productId].push({
        _id: variant._id,
        price: variant.price,
        stock: variant.stock,
        images: variant.images,
        attributes: formattedAttributes,
      });
    });
  }

  // تنسيق المنتجات (نفس GetAllProducts بالضبط)
  const formattedProducts = products.map((product) => {
    const baseProduct = {
      _id: product._id,
      name: product.name[lang] || product.name.en,
      description: product.description?.[lang] || product.description?.en || "",
      categories: (product.categories || []).map((cat) => ({
        _id: cat._id,
        name: cat.name[lang] || cat.name.en,
        slug: cat.slug,
      })),
      brands: (product.brands || []).map((brand) => ({
        _id: brand._id,
        name: brand.name[lang] || brand.name.en,
        image: brand.image,
      })),
      images: product.images || [],
      mainPrice: product.mainPrice,
      disCountPrice: product.disCountPrice || null,
      currency: product.currency,
      sku: product.sku,
      tax: product.tax,
      rating: product.rating,
      seo: product.seo,
      hasVariants: product.hasVariants,
      inStock: product.inStock,
      unlimitedStock: product.unlimitedStock,
      stock: product.stock || 0,
      tags: product.tags || [],
      bulkDiscounts: product.bulkDiscounts || [],
    };

    if (product.hasVariants) {
      return {
        ...baseProduct,
        variants: variantsMap[product._id.toString()] || [],
      };
    } else {
      return {
        ...baseProduct,
        price: product.mainPrice,
        stock: product.unlimitedStock ? "unlimited" : product.stock,
        variants: [],
      };
    }
  });

  // معلومات الـ pagination
  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalProducts / limitNum),
    totalItems: totalProducts,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalProducts / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب المنتجات في القسم بنجاح مع التصفح الصفحي ✅",
    count: formattedProducts.length,
    pagination,
    data: formattedProducts,
  });
});

export const createBrand = asyncHandelr(async (req, res, next) => {
  const { name, description } = req.body;

  // ✅ Validation
  if (!name?.ar || !name?.en) {
    return next(
      new Error("❌ اسم البراند مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  if (!req.file) {
    return next(new Error("❌ يجب رفع صورة للبراند", { cause: 400 }));
  }

  // ✅ رفع الصورة إلى Cloudinary
  const result = await cloud.uploader.upload(req.file.path, {
    folder: "brands",
  });
  fs.unlinkSync(req.file.path);

  // ✅ إنشاء البراند
  const brand = await BrandModel.create({
    name: {
      ar: name.ar.trim(),
      en: name.en.trim(),
    },
    description: {
      ar: description?.ar?.trim() || "",
      en: description?.en?.trim() || "",
    },
    image: {
      url: result.secure_url,
      public_id: result.public_id,
    },
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء البراند بنجاح ✅",
    data: brand,
  });
});

export const getBrands = asyncHandelr(async (req, res, next) => {
  // ✅ جلب كل البراندات النشطة
  let brands = await BrandModel.find({ isActive: true })
    .select("name description image")
    .sort({ createdAt: -1 })
    .lean();

  // ✅ جلب عدد المنتجات لكل براند باستخدام aggregation
  const brandStats = await ProductModellll.aggregate([
    {
      $match: {
        isActive: true,
        status: "published", // اختياري: بس المنتجات المنشورة
      },
    },
    { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$brands",
        productCount: { $sum: 1 },
      },
    },
  ]);

  // تحويل إلى map للوصول السريع: brandId → productCount
  const brandProductCountMap = {};
  let totalProducts = 0;
  brandStats.forEach((stat) => {
    if (stat._id) {
      // تجاهل null (منتجات بدون براند)
      brandProductCountMap[stat._id.toString()] = stat.productCount;
      totalProducts += stat.productCount;
    }
  });

  // ✅ إضافة productCount لكل براند
  brands = brands.map((brand) => ({
    ...brand,
    productCount: brandProductCountMap[brand._id.toString()] || 0,
  }));

  // ✅ حساب الإحصائيات العامة
  const totalBrands = brands.length;
  const averageProductsPerBrand =
    totalBrands > 0 ? Math.round(totalProducts / totalBrands) : 0;

  // العلامة الأعلى منتجات
  let topBrand = null;
  if (brands.length > 0) {
    const sorted = [...brands].sort((a, b) => b.productCount - a.productCount);
    const highest = sorted[0];
    if (highest.productCount > 0) {
      topBrand = {
        name: highest.name,
        productCount: highest.productCount,
      };
    }
  }

  // ✅ الإحصائيات النهائية
  const stats = {
    totalBrands,
    totalProducts,
    averageProductsPerBrand,
    topBrand: topBrand || { name: { ar: "-", en: "-" }, productCount: 0 },
  };

  res.status(200).json({
    success: true,
    message: "تم جلب العلامات التجارية مع الإحصائيات بنجاح ✅",
    stats,
    count: brands.length,
    data: brands,
  });
});

export const getBrandById = asyncHandelr(async (req, res, next) => {
  const { brandId } = req.params;

  // التحقق من وجود brandId
  if (!brandId) {
    return next(new Error("❌ معرف العلامة التجارية مطلوب", { cause: 400 }));
  }

  // جلب البراند المطلوب
  const brand = await BrandModel.findOne({
    _id: brandId,
    isActive: true,
  })
    .select("name description image createdAt")
    .lean();

  if (!brand) {
    return next(
      new Error("❌ العلامة التجارية غير موجودة أو غير مفعلة", { cause: 404 }),
    );
  }

  // جلب إحصائيات المنتجات لكل البراندات (عشان نحسب المتوسط والأعلى)
  const brandStats = await ProductModellll.aggregate([
    {
      $match: {
        isActive: true,
        status: "published",
      },
    },
    { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$brands",
        productCount: { $sum: 1 },
      },
    },
  ]);

  const brandProductCountMap = {};
  let totalProducts = 0;
  brandStats.forEach((stat) => {
    if (stat._id) {
      const idStr = stat._id.toString();
      brandProductCountMap[idStr] = stat.productCount;
      totalProducts += stat.productCount;
    }
  });

  // عدد المنتجات لهذا البراند
  const thisBrandProductCount = brandProductCountMap[brandId] || 0;

  // جلب عدد كل البراندات النشطة (للمتوسط)
  const totalBrands = await BrandModel.countDocuments({ isActive: true });

  const averageProductsPerBrand =
    totalBrands > 0 ? Math.round(totalProducts / totalBrands) : 0;

  // هل هذا البراند الأعلى؟
  let isTopBrand = false;
  let topBrandCount = 0;
  if (Object.keys(brandProductCountMap).length > 0) {
    topBrandCount = Math.max(...Object.values(brandProductCountMap));
    isTopBrand =
      thisBrandProductCount === topBrandCount && thisBrandProductCount > 0;
  }

  const formattedBrand = {
    _id: brand._id,
    name: brand.name,
    description: brand.description || { ar: "", en: "" },
    image: brand.image,
    createdAt: brand.createdAt,
    productCount: thisBrandProductCount,
  };

  const stats = {
    totalBrands,
    totalProducts,
    averageProductsPerBrand,
    thisBrandProductCount,
    isTopBrand,
    topBrandMaxCount: topBrandCount,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب العلامة التجارية مع الإحصائيات بنجاح ✅",
    stats,
    data: formattedBrand,
  });
});

export const updateBrand = asyncHandelr(async (req, res, next) => {
  const { brandId } = req.params;
  const { name, description, isActive } = req.body;

  const brand = await BrandModel.findById(brandId);
  if (!brand) {
    return next(new Error("❌ البراند غير موجود", { cause: 404 }));
  }

  // ✅ تعديل الاسم
  if (name) {
    if (name.ar) brand.name.ar = name.ar.trim();
    if (name.en) brand.name.en = name.en.trim();
  }

  // ✅ تعديل الوصف
  if (description) {
    if (description.ar) brand.description.ar = description.ar.trim();
    if (description.en) brand.description.en = description.en.trim();
  }

  // ✅ تعديل الحالة
  if (isActive !== undefined) {
    brand.isActive = !!isActive;
  }

  // ✅ تعديل الصورة (استبدال كامل)
  if (req.file) {
    // حذف الصورة القديمة من Cloudinary
    if (brand.image.public_id) {
      await cloud.uploader.destroy(brand.image.public_id);
    }

    // رفع الصورة الجديدة
    const result = await cloud.uploader.upload(req.file.path, {
      folder: "brands",
    });
    fs.unlinkSync(req.file.path);

    brand.image = {
      url: result.secure_url,
      public_id: result.public_id,
    };
  }

  await brand.save();

  res.status(200).json({
    success: true,
    message: "تم تعديل البراند بنجاح ✅",
    data: brand,
  });
});

export const deleteBrand = asyncHandelr(async (req, res, next) => {
  const { brandId } = req.params;

  const brand = await BrandModel.findById(brandId);
  if (!brand) {
    return next(new Error("❌ البراند غير موجود", { cause: 404 }));
  }

  // 🗑️ حذف الصورة من Cloudinary
  await cloud.uploader.destroy(brand.image.public_id);

  // 🗑️ حذف البراند
  await BrandModel.findByIdAndDelete(brandId);

  res.status(200).json({
    success: true,
    message: " تم حذف البراند بنجاح",
  });
});

export const createAttribute = asyncHandelr(async (req, res, next) => {
  const { name, type } = req.body;

  // ✅ التحقق من وجود مستخدم مسجل دخول
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لإنشاء خاصية", { cause: 401 }));
  }

  // // ✅ التحقق من صلاحية الأدمن أو الأونر فقط
  // if (!["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بإنشاء خصائص", { cause: 403 }));
  // }

  // ✅ التحقق من الحقول
  if (!name?.ar || !name?.en) {
    return next(
      new Error("❌ اسم الخاصية مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  if (!type) {
    return next(new Error("❌ نوع الخاصية مطلوب", { cause: 400 }));
  }

  // ✅ التحقق من عدم التكرار (بالاسم الإنجليزي)
  // const exists = await AttributeModell.findOne({
  //     "name.en": { $regex: `^${name.en.trim()}$`, $options: "i" } // case insensitive
  // });

  // if (exists) {
  //     return next(new Error("❌ هذه الخاصية موجودة بالفعل", { cause: 409 }));
  // }

  // ✅ إنشاء الخاصية مع createdBy
  const attribute = await AttributeModell.create({
    name: {
      ar: name.ar.trim(),
      en: name.en.trim(),
    },
    type: type.trim(),
    createdBy: req.user._id, // ← هنا التوكن بيشتغل
  });

  // جلب الخاصية مع اسم المستخدم اللي أنشأها (اختياري للـ response)
  const populatedAttribute = await AttributeModell.findById(attribute._id)
    .populate("createdBy", "fullName email")
    .lean();

  res.status(201).json({
    success: true,
    message: "تم إنشاء الخاصية بنجاح ✅",
    data: populatedAttribute,
  });
});

export const deleteAttribute = asyncHandelr(async (req, res, next) => {
  const { attributeId } = req.params;

  const attribute = await AttributeModell.findById(attributeId);
  if (!attribute) {
    return next(new Error("❌ الخاصية غير موجودة", { cause: 404 }));
  }

  // التحقق إذا كانت الخاصية مستخدمة في variants
  const usedInVariants = await VariantModel.countDocuments({
    "attributes.attributeId": attributeId,
  });

  if (usedInVariants > 0) {
    return next(
      new Error("❌ لا يمكن حذف الخاصية لأنها مستخدمة في متغيرات منتجات", {
        cause: 400,
      }),
    );
  }

  // Soft delete: نغير isActive إلى false
  attribute.isActive = false;
  await attribute.save();

  // اختياري: حذف القيم المرتبطة (أو نعمل soft delete ليها كمان)
  await AttributeValueModel.updateMany({ attributeId }, { isActive: false });

  res.status(200).json({
    success: true,
    message: "تم حذف الخاصية بنجاح (تم إلغاء تفعيلها) ✅",
    data: {
      _id: attribute._id,
      name: attribute.name,
      isActive: false,
    },
  });
});

export const updateAttribute = asyncHandelr(async (req, res, next) => {
  const { attributeId } = req.params;
  const { name, type, isActive } = req.body;

  // التحقق من وجود الخاصية
  const attribute = await AttributeModell.findById(attributeId);
  if (!attribute) {
    return next(new Error("❌ الخاصية غير موجودة", { cause: 404 }));
  }

  // تحديث الاسم (إذا تم إرساله)
  if (name) {
    if (!name.ar || !name.en) {
      return next(
        new Error("❌ اسم الخاصية مطلوب بالعربي والإنجليزي", { cause: 400 }),
      );
    }

    // التحقق من عدم التكرار (ما عدا الخاصية نفسها)
    // const nameExists = await AttributeModell.findOne({
    //     "name.en": name.en,
    //     _id: { $ne: attributeId }
    // });

    // if (nameExists) {
    //     return next(new Error("❌ هذا الاسم (بالإنجليزي) مستخدم في خاصية أخرى", { cause: 409 }));
    // }

    attribute.name = {
      ar: name.ar.trim(),
      en: name.en.trim(),
    };
  }

  // تحديث النوع
  if (type) {
    attribute.type = type.trim();
  }

  // تحديث الحالة (نشط / غير نشط)
  if (isActive !== undefined) {
    attribute.isActive = !!isActive;
  }

  await attribute.save();

  res.status(200).json({
    success: true,
    message: "تم تعديل الخاصية بنجاح ✅",
    data: attribute,
  });
});

export const createAttributeValue = asyncHandelr(async (req, res, next) => {
  const { attributeId, value, hexCode } = req.body;

  // ✅ التحقق من وجود مستخدم مسجل دخول
  if (!req.user) {
    return next(
      new Error("❌ يجب تسجيل الدخول لإضافة قيمة خاصية", { cause: 401 }),
    );
  }

  // ✅ التحقق من صلاحية الأدمن أو الأونر فقط
  // if (!["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بإضافة قيم خاصية", { cause: 403 }));
  // }

  // ✅ التحقق من الحقول
  if (!attributeId) {
    return next(new Error("❌ attributeId مطلوب", { cause: 400 }));
  }

  if (!value?.ar || !value?.en) {
    return next(
      new Error("❌ قيمة الخاصية مطلوبة بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  // ✅ التحقق من وجود الخاصية
  const attribute = await AttributeModell.findById(attributeId);
  if (!attribute) {
    return next(new Error("❌ الخاصية غير موجودة", { cause: 404 }));
  }

  // ✅ التحقق من عدم تكرار القيمة (بالإنجليزي - case insensitive)
  // const exists = await AttributeValueModel.findOne({
  //     attributeId,
  //     "value.en": { $regex: `^${value.en.trim()}$`, $options: "i" }
  // });

  // if (exists) {
  //     return next(new Error("❌ هذه القيمة موجودة بالفعل لهذه الخاصية", { cause: 409 }));
  // }

  // ✅ إنشاء القيمة مع createdBy
  const attributeValue = await AttributeValueModel.create({
    attributeId,
    value: {
      ar: value.ar.trim(),
      en: value.en.trim(),
    },
    hexCode: hexCode ? hexCode.trim() : null,
    createdBy: req.user._id, // ← هنا التوكن بيشتغل
  });

  // جلب القيمة مع اسم المستخدم اللي أنشأها (اختياري)
  const populatedValue = await AttributeValueModel.findById(attributeValue._id)
    .populate("createdBy", "fullName email")
    .lean();

  res.status(201).json({
    success: true,
    message: "تم إضافة القيمة بنجاح ✅",
    data: populatedValue,
  });
});

export const getAttributesWithValues = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من وجود توكن ومستخدم مسجل دخول
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لعرض الخصائص", { cause: 401 }));
  }

  const isAdmin = req.user.accountType === "Admin";
  const isOwner = req.user.accountType === "Owner";
  const isVendor = req.user.accountType === "vendor";

  if (!isAdmin && !isOwner && !isVendor) {
    return next(new Error("❌ غير مصرح لك بعرض الخصائص", { cause: 403 }));
  }

  let attributes;

  // فلتر أساسي للخصائص المفعلة
  let attributeFilter = { isActive: true };

  // لو بائع → يشوف فقط اللي هو أنشأها
  if (isVendor) {
    attributeFilter.createdBy = req.user._id;
  }
  // لو أدمن أو أونر → يشوف الكل (بدون فلتر createdBy)

  attributes = await AttributeModell.find(attributeFilter)
    .populate("createdBy", "fullName email") // اختياري: عشان نعرف مين أنشأها
    .lean();

  if (attributes.length === 0) {
    return res.status(200).json({
      success: true,
      message: isVendor
        ? "لا توجد خصائص أنشأتها أنت حاليًا"
        : "لا توجد خصائص في النظام حاليًا",
      stats: {
        totalAttributes: 0,
        totalValues: 0,
        averageValuesPerAttribute: 0,
        mostCommonType: { type: "-", count: 0 },
      },
      data: [],
    });
  }

  const attributeIds = attributes.map((a) => a._id);

  // جلب القيم اللي تابعة للخصائص دي فقط + اللي أنشأها المستخدم (لو بائع)
  let valueFilter = {
    attributeId: { $in: attributeIds },
    isActive: true,
  };

  if (isVendor) {
    valueFilter.createdBy = req.user._id;
  }

  const values = await AttributeValueModel.find(valueFilter)
    .populate("createdBy", "fullName email")
    .lean();

  // تنسيق البيانات
  const result = attributes.map((attr) => ({
    _id: attr._id,
    name: attr.name,
    type: attr.type,
    createdBy: attr.createdBy
      ? {
          _id: attr.createdBy._id,
          fullName: attr.createdBy.fullName,
          email: attr.createdBy.email,
        }
      : null,
    createdAt: attr.createdAt,
    values: values
      .filter((v) => v.attributeId.toString() === attr._id.toString())
      .map((v) => ({
        _id: v._id,
        value: v.value,
        hexCode: v.hexCode || null,
        createdBy: v.createdBy
          ? {
              _id: v.createdBy._id,
              fullName: v.createdBy.fullName,
              email: v.createdBy.email,
            }
          : null,
        createdAt: v.createdAt,
      })),
  }));

  // حساب الإحصائيات
  const totalAttributes = attributes.length;
  const totalValues = values.length;
  const averageValuesPerAttribute =
    totalAttributes > 0 ? Math.round(totalValues / totalAttributes) : 0;

  const typeCounts = {};
  result.forEach((attr) => {
    const type = attr.type || "unknown";
    const valueCount = attr.values.length;
    typeCounts[type] = (typeCounts[type] || 0) + valueCount;
  });

  let mostCommonType = { type: "-", count: 0 };
  if (Object.keys(typeCounts).length > 0) {
    const maxType = Object.keys(typeCounts).reduce((a, b) =>
      typeCounts[a] > typeCounts[b] ? a : b,
    );
    mostCommonType = { type: maxType, count: typeCounts[maxType] };
  }

  const stats = {
    totalAttributes,
    totalValues,
    averageValuesPerAttribute,
    mostCommonType,
  };

  res.status(200).json({
    success: true,
    message: isVendor
      ? "تم جلب الخصائص والقيم التي أنشأتها بنجاح ✅"
      : "تم جلب جميع الخصائص والقيم في النظام بنجاح ✅",
    stats,
    data: result,
  });
});

export const getAttributeValues = asyncHandelr(async (req, res, next) => {
  const { attributeId } = req.params;

  const values = await AttributeValueModel.find({
    attributeId,
    isActive: true,
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: "تم جلب القيم بنجاح",
    data: values,
  });
});

export const GetBrands = asyncHandelr(async (req, res, next) => {
  const { lang = "en" } = req.query; // ?lang=ar أو en (default: en)

  // جلب كل البراندات النشطة فقط
  const brands = await BrandModel.find({ isActive: true })
    .select("name description image createdAt")
    .sort({ createdAt: -1 })
    .lean();

  if (brands.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لا توجد علامات تجارية حاليًا",
      count: 0,
      data: [],
    });
  }

  // تنسيق البيانات مع الترجمة حسب اللغة
  const formattedBrands = brands.map((brand) => ({
    _id: brand._id,
    name: brand.name[lang] || brand.name.en, // لو اللغة مش موجودة، يرجع الإنجليزي
    description: brand.description?.[lang] || brand.description?.en || "",
    image: brand.image,
    createdAt: brand.createdAt,
  }));

  res.status(200).json({
    success: true,
    message: "تم جلب العلامات التجارية بنجاح ✅",
    count: formattedBrands.length,
    data: formattedBrands,
  });
});

export const becomeSeller = asyncHandelr(async (req, res, next) => {
  const { fullName, email, phone, companyName, categories, password  } =
    req.body;

  if (!fullName || !password) {
    return next(new Error("الاسم الكامل وكلمة المرور مطلوبين", { cause: 400 }));
  }
  if (!email && !phone) {
    return next(
      new Error("يجب إدخال البريد الإلكتروني أو رقم الهاتف", { cause: 400 }),
    );
  }
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return next(new Error("يجب اختيار قسم واحد على الأقل", { cause: 400 }));
  }

  const existingVendor = await Usermodel.findOne({
    $or: [
      ...(email ? [{ email: email.toLowerCase() }] : []),
      ...(phone ? [{ phone }] : []),
    ],
  });

  if (existingVendor) {
    if (email && existingVendor.email === email.toLowerCase()) {
      return next(new Error("البريد الإلكتروني مستخدم من قبل", { cause: 400 }));
    }
    if (phone && existingVendor.phone === phone) {
      return next(new Error("رقم الهاتف مستخدم من قبل", { cause: 400 }));
    }
  }

  const validCategories = await CategoryModellll.countDocuments({
    _id: { $in: categories },
    isActive: true,
  });
  if (validCategories !== categories.length) {
    return next(
      new Error("واحد أو أكثر من الأقسام غير موجود أو غير مفعل", {
        cause: 400,
      }),
    );
  }

  const hashedPassword = await generatehash({ planText: password });

  const vendor = await Usermodel.create({
    fullName,
    email: email?.toLowerCase(),
    phone,
    companyName,
    categories,
    password: hashedPassword,
    status: "PENDING",
    accountType: "vendor",
    isConfirmed: false,
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 دقايق

  vendor.emailOTP = otp;
  vendor.otpExpiresAt = otpExpiresAt;
  vendor.attemptCount = 0;
  await vendor.save();

  // إرسال OTP بالإيميل
  await sendemail({
    to: [vendor.email],
    subject: "كود تفعيل حساب البائع - متجرك",
    text: `مرحبًا ${fullName}،\n\nكود تفعيل حسابك كبائع هو: ${otp}\nصالح لمدة 10 دقائق.\nبعد التفعيل، سيتم مراجعة طلبك من الإدارة.\n\nتحياتنا،\nفريق المنصة`,
    html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background: #f9f9f9; border-radius: 10px;">
                <h2>مرحبًا ${fullName} 👋</h2>
                <p>شكرًا لتقديم طلب الانضمام كبائع!</p>
                <p style="font-size: 18px;">كود تفعيل حسابك هو:</p>
                <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</p>
                <p>هذا الكود صالح لمدة <strong>10 دقائق</strong>.</p>
                <p>بعد التفعيل، سيتم مراجعة طلبك من الإدارة.</p>
                <p style="color: #999; font-size: 14px;">لا تشارك هذا الكود مع أحد.</p>
            </div>
        `,
  });

  return successresponse(
    res,
    "تم تقديم طلب الانضمام كبائع بنجاح ✅\nتم إرسال كود التفعيل إلى بريدك الإلكتروني",
    201,
    {
      vendorId: vendor._id,
      status: "PENDING",
      isConfirmed: false,
      message: "يرجى تفعيل الحساب أولاً، ثم انتظار موافقة الإدارة",
    },
  );
});

export const sendOtpforeach = asyncHandelr(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new Error("البريد الإلكتروني مطلوب", { cause: 400 }));
  }

  // البحث عن المستخدم بالإيميل
  const user = await Usermodel.findOne({
    email: email.toLowerCase(),
  });

  if (!user) {
    return next(new Error("البريد الإلكتروني غير مسجل", { cause: 400 }));
  }

  // تحديد نوع الحساب
  const isVendor = user.accountType === "vendor";
  const isAdmin = user.accountType === "Admin";
  const isOwner = user.accountType === "Owner";

  if (!isVendor && !isAdmin && !isOwner) {
    return next(
      new Error("هذا الحساب غير مصرح له بتسجيل الدخول بهذه الطريقة", {
        cause: 403,
      }),
    );
  }

  // للبائع فقط: يتحقق من الموافقة
  if (isVendor && user.status !== "ACCEPTED") {
    return next(
      new Error("طلب الانضمام كبائع لم يُقبل بعد، لا يمكن إرسال كود التحقق", {
        cause: 400,
      }),
    );
  }

  // توليد OTP (6 أرقام)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 دقايق

  // حفظ الـ OTP في الداتابيز
  user.emailOTP = otp;
  user.otpExpiresAt = otpExpiresAt;
  user.attemptCount = 0; // إعادة العد
  await user.save();

  // عنوان الإيميل ورسالة حسب الدور
  let subject = "كود التحقق لتسجيل الدخول";
  let roleGreeting = "";

  if (isOwner) {
    subject = "كود التحقق - لوحة تحكم المالك (Owner)";
    roleGreeting = "عزيزي المالك،";
  } else if (isAdmin) {
    subject = "كود التحقق - لوحة تحكم الأدمن";
    roleGreeting = "عزيزي الأدمن،";
  } else if (isVendor) {
    subject = "كود التحقق - لوحة تحكم المتجر";
    roleGreeting = "عزيزي صاحب المتجر،";
  }

  // إرسال الإيميل
  await sendemail({
    to: [email],
    subject,
    text: `كود التحقق الخاص بك هو: ${otp}\nصالح لمدة 10 دقائق فقط.`,
    html: `
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background: #f9f9f9; border-radius: 10px;">
                <h2 style="color: #333;">${roleGreeting}</h2>
                <p style="font-size: 18px;">كود التحقق الخاص بك هو:</p>
                <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${otp}</p>
                <p style="color: #666;">هذا الكود صالح لمدة <strong>10 دقائق</strong> فقط.</p>
                <p style="color: #999; font-size: 14px;">لا تشارك هذا الكود مع أحد.</p>
            </div>
        `,
  });

  // رسالة نجاح حسب الدور
  let message = "تم إرسال كود التحقق إلى بريدك الإلكتروني ✅";
  if (isOwner) message = "تم إرسال كود التحقق للمالك بنجاح ✅";
  else if (isAdmin) message = "تم إرسال كود التحقق للأدمن بنجاح ✅";
  else if (isVendor) message = "تم إرسال كود التحقق للبائع بنجاح ✅";

  return successresponse(res, message, 200);
});

export const verifyOtpLogin = asyncHandelr(async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return next(
      new Error("البريد الإلكتروني وكود التحقق مطلوبين", { cause: 400 }),
    );
  }

  const vendor = await Usermodel.findOne({
    email: email.toLowerCase(),
    accountType: "vendor",
  });

  if (!vendor) {
    return next(new Error("البريد الإلكتروني غير مسجل كبائع", { cause: 400 }));
  }

  // التحقق من عدد المحاولات
  if (vendor.attemptCount >= 5 && vendor.blockUntil > Date.now()) {
    const minutesLeft = Math.ceil(
      (vendor.blockUntil - Date.now()) / (60 * 1000),
    );
    return next(
      new Error(`تم حظر الحساب مؤقتًا، حاول بعد ${minutesLeft} دقيقة`, {
        cause: 400,
      }),
    );
  }

  // التحقق من الكود
  if (vendor.emailOTP !== otp) {
    vendor.attemptCount += 1;
    if (vendor.attemptCount >= 5) {
      vendor.blockUntil = Date.now() + 15 * 60 * 1000;
    }
    await vendor.save();
    return next(new Error("كود التحقق غير صحيح", { cause: 400 }));
  }

  if (vendor.otpExpiresAt < Date.now()) {
    return next(new Error("انتهت صلاحية الكود، اطلب كود جديد", { cause: 400 }));
  }

  // تفعيل الحساب
  vendor.isConfirmed = true;
  vendor.emailOTP = undefined;
  vendor.otpExpiresAt = undefined;
  vendor.attemptCount = 0;
  vendor.blockUntil = undefined;
  await vendor.save();

  return successresponse(
    res,
    "تم تفعيل حساب البائع بنجاح ✅\nطلبك الآن في انتظار موافقة الإدارة",
    200,
    {
      vendorId: vendor._id,
      isConfirmed: true,
      status: vendor.status,
    },
  );
});

export const getAllVendors = asyncHandelr(async (req, res, next) => {
  const {
    lang = "en",
    page = 1,
    limit = 10,
    status, // optional: PENDING, ACCEPTED, REFUSED
  } = req.query;

  // تأمين الـ pagination
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // فلتر أساسي للبائعين
  let filter = { accountType: "vendor" };

  if (status) {
    const validStatuses = ["PENDING", "ACCEPTED", "REFUSED"];
    if (!validStatuses.includes(status)) {
      return next(
        new Error("حالة غير صحيحة، استخدم: PENDING, ACCEPTED, REFUSED", {
          cause: 400,
        }),
      );
    }
    filter.status = status;
  }

  // ✅ حساب الإحصائيات العامة
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const statsAggregation = await Usermodel.aggregate([
    { $match: { accountType: "vendor" } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  let totalVendors = 0;
  let activeVendors = 0;
  let pendingVendors = 0;
  let suspendedVendors = 0;

  statsAggregation.forEach((stat) => {
    totalVendors += stat.count;
    if (stat._id === "ACCEPTED") activeVendors = stat.count;
    if (stat._id === "PENDING") pendingVendors = stat.count;
    if (stat._id === "REFUSED" || stat._id === "SUSPENDED")
      suspendedVendors += stat.count;
  });

  // جدد هذا الشهر
  const newThisMonth = await Usermodel.countDocuments({
    accountType: "vendor",
    createdAt: { $gte: startOfMonth },
  });

  // إجمالي المنتجات من كل البائعين
  const totalProducts = await ProductModellll.countDocuments({
    createdBy: {
      $in: await Usermodel.find({ accountType: "vendor" }).distinct("_id"),
    },
    isActive: true,
  });

  // نسبة الزيادة في النشطين (مثال: مقارنة بالشهر السابق - افتراضي +8.5%)
  const growthPercentage = "+8.5%"; // يمكن نحسبه ديناميكيًا لاحقًا

  // عدد البائعين الكلي للـ pagination
  const totalVendorsForPagination = await Usermodel.countDocuments(filter);

  // جلب البائعين مع pagination + populate للأقسام
  const vendors = await Usermodel.find(filter)
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .select(
      "fullName email phone companyName categories status createdAt updatedAt",
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  if (vendors.length === 0) {
    return res.status(200).json({
      success: true,
      message: "لا يوجد بائعين حاليًا",
      summary: {
        totalVendors,
        activeVendors: `${activeVendors} (${growthPercentage})`,
        pendingVendors,
        newThisMonth,
        totalProducts: formatNumber(totalProducts),
        suspendedVendors,
      },
      count: 0,
      pagination: {
        currentPage: pageNum,
        totalPages: 0,
        totalItems: 0,
        itemsPerPage: limitNum,
        hasNext: false,
        hasPrev: false,
      },
      data: [],
    });
  }

  // تنسيق البيانات مع ترجمة أسماء الأقسام
  const formattedVendors = vendors.map((vendor) => ({
    _id: vendor._id,
    fullName: vendor.fullName,
    email: vendor.email,
    phone: vendor.phone || null,
    companyName: vendor.companyName || null,
    status: vendor.status,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    categories: (vendor.categories || []).map((cat) => ({
      _id: cat._id,
      name: cat.name[lang] || cat.name.en,
      slug: cat.slug,
    })),
  }));

  // معلومات الـ pagination
  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalVendorsForPagination / limitNum),
    totalItems: totalVendorsForPagination,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalVendorsForPagination / limitNum),
    hasPrev: pageNum > 1,
  };

  // دالة تنسيق الأرقام (مثل 8450 → 8.450k)
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(3).replace(/\.?0+$/, "") + "k";
    }
    return num.toString();
  };

  // الإحصائيات العامة
  const summary = {
    totalVendors,
    activeVendors: `${activeVendors} (${growthPercentage})`,
    pendingVendors,
    newThisMonth,
    totalProducts: formatNumber(totalProducts),
    suspendedVendors,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب البائعين بنجاح ✅",
    summary,
    count: formattedVendors.length,
    pagination,
    data: formattedVendors,
  });
});

export const getVendorDetails = asyncHandelr(async (req, res, next) => {
  const { vendorId } = req.params;

  // ✅ التحقق من صلاحية الأدمن
  if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
    return next(new Error("❌ غير مصرح لك بعرض تفاصيل التاجر", { cause: 403 }));
  }

  // تحقق من صحة vendorId
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new Error("❌ معرف التاجر غير صحيح", { cause: 400 }));
  }

  const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

  const { lang = "en" } = req.query;

  // ✅ حساب الإحصائيات العامة للتاجر ده فقط
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const statsAggregation = await Usermodel.aggregate([
    { $match: { _id: vendorObjectId, accountType: "vendor" } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  let totalVendors = 0;
  let activeVendors = 0;
  let pendingVendors = 0;
  let suspendedVendors = 0;

  statsAggregation.forEach((stat) => {
    totalVendors += stat.count;
    if (stat._id === "ACCEPTED") activeVendors = stat.count;
    if (stat._id === "PENDING") pendingVendors = stat.count;
    if (stat._id === "REFUSED" || stat._id === "SUSPENDED")
      suspendedVendors += stat.count;
  });

  // جدد هذا الشهر (للتاجر ده)
  const newThisMonth = await Usermodel.countDocuments({
    _id: vendorObjectId,
    accountType: "vendor",
    createdAt: { $gte: startOfMonth },
  });

  // إجمالي المنتجات من التاجر ده
  const totalProducts = await ProductModellll.countDocuments({
    createdBy: vendorObjectId,
    isActive: true,
  });

  // نسبة الزيادة في النشطين (مثال: مقارنة بالشهر السابق - افتراضي +8.5%)
  const growthPercentage = "+8.5%"; // يمكن نحسبه ديناميكيًا لاحقًا

  // جلب التاجر
  const vendor = await Usermodel.findById(vendorObjectId)
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .select(
      "fullName email phone companyName categories status createdAt updatedAt",
    )
    .lean();

  if (!vendor) {
    return res.status(404).json({
      success: false,
      message: "❌ التاجر غير موجود",
    });
  }

  // تنسيق البيانات مع ترجمة أسماء الأقسام
  const formattedVendor = {
    _id: vendor._id,
    fullName: vendor.fullName,
    email: vendor.email,
    phone: vendor.phone || null,
    companyName: vendor.companyName || null,
    status: vendor.status,
    createdAt: vendor.createdAt,
    updatedAt: vendor.updatedAt,
    categories: (vendor.categories || []).map((cat) => ({
      _id: cat._id,
      name: cat.name[lang] || cat.name.en,
      slug: cat.slug,
    })),
  };

  // معلومات الـ pagination (صفحة واحدة فقط)
  const pagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 1,
    itemsPerPage: 10,
    hasNext: false,
    hasPrev: false,
  };

  // دالة تنسيق الأرقام (مثل 8450 → 8.450k)
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(3).replace(/\.?0+$/, "") + "k";
    }
    return num.toString();
  };

  // الإحصائيات العامة (نفس اللي في getAllVendors)
  const summary = {
    totalVendors: 1, // لأن تاجر واحد
    activeVendors: `${activeVendors} (${growthPercentage})`,
    pendingVendors,
    newThisMonth,
    totalProducts: formatNumber(totalProducts),
    suspendedVendors,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب تفاصيل التاجر بنجاح ",
    summary,
    count: 1,
    pagination,
    data: [formattedVendor], // مصفوفة بتاجر واحد
  });
});

export const updateVendorStatus = asyncHandelr(async (req, res, next) => {
  const { vendorId } = req.params;
  const { status } = req.body; // "ACCEPTED" أو "REFUSED"

  // التحقق من الحالة المرسلة
  if (!status || !["ACCEPTED", "REFUSED"].includes(status)) {
    return next(
      new Error("يجب إرسال حالة صحيحة: ACCEPTED أو REFUSED", { cause: 400 }),
    );
  }

  // جلب البائع
  const vendor = await Usermodel.findOne({
    _id: vendorId,
    accountType: "vendor",
  });

  if (!vendor) {
    return next(new Error("البائع غير موجود", { cause: 404 }));
  }

  // لو الحالة بالفعل نفس اللي هيتغير ليها
  if (vendor.status === status) {
    return next(
      new Error(
        `حالة البائع بالفعل ${status === "ACCEPTED" ? "مقبول" : "مرفوض"}`,
        { cause: 400 },
      ),
    );
  }

  // لو كان مرفوض وهنقبله أو العكس، تمام
  const oldStatus = vendor.status;
  vendor.status = status;
  await vendor.save();

  // تحديد عنوان ورسالة الإيميل حسب الحالة
  let subject = "";
  let htmlContent = "";
  let textContent = "";

  if (status === "ACCEPTED") {
    subject = "🎉 تم قبول طلب انضمامك كبائع!";
    textContent = `مرحبًا ${vendor.fullName}،

تهانينا! تم قبول طلبك للانضمام كبائع على منصتنا.
يمكنك الآن تسجيل الدخول إلى لوحة التحكم الخاصة بك والبدء في إضافة منتجاتك.

بريدك الإلكتروني: ${vendor.email}
كلمة المرور: التي اخترتها عند التسجيل

تحياتنا،
فريق المنصة`;

    htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #28a745;">🎉 تهانينا!</h2>
                <p>مرحبًا <strong>${vendor.fullName}</strong>،</p>
                <p>سعداء جدًا بإبلاغك أن طلب انضمامك كبائع قد <strong style="color: #28a745;">تم قبوله</strong>!</p>
                <p>يمكنك الآن:</p>
                <ul>
                    <li>تسجيل الدخول إلى لوحة تحكم البائع</li>
                    <li>إضافة منتجاتك</li>
                    <li>إدارة المخزون والطلبات</li>
                </ul>
                <p><strong>بيانات الدخول:</strong><br>
                البريد الإلكتروني: <code>${vendor.email}</code><br>
                كلمة المرور: التي اخترتها عند التسجيل</p>
                <p>تحياتنا،<br><strong>فريق المنصة</strong></p>
            </div>
        `;
  } else if (status === "REFUSED") {
    subject = "😔 تم رفض طلب انضمامك كبائع";
    textContent = `مرحبًا ${vendor.fullName}،

نشكرك على اهتمامك بالانضمام إلينا كبائع.
للأسف، بعد المراجعة، تم رفض طلبك في الوقت الحالي.

إذا كان لديك أي استفسار، تواصل معنا.

تحياتنا،
فريق المنصة`;

    htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #dc3545;">😔 تم رفض طلب الانضمام</h2>
                <p>مرحبًا <strong>${vendor.fullName}</strong>،</p>
                <p>نشكرك على اهتمامك بالانضمام إلينا كبائع على منصتنا.</p>
                <p>للأسف، بعد مراجعة طلبك، تم <strong style="color: #dc3545;">رفضه</strong> في الوقت الحالي.</p>
                <p>إذا كان لديك أي استفسار أو ترغب في معرفة السبب، يرجى التواصل مع الدعم.</p>
                <p>تحياتنا،<br><strong>فريق المنصة</strong></p>
            </div>
        `;
  }

  // إرسال الإيميل
  try {
    await sendemail({
      to: [vendor.email],
      subject,
      text: textContent,
      html: htmlContent,
    });
  } catch (error) {
    console.error("فشل إرسال الإيميل للبائع:", error);
    // مش هنرجع error عشان ما يفشلش العملية كلها، بس نسجل في اللوج
  }

  // رسالة نجاح للأدمن
  const action = status === "ACCEPTED" ? "قبول" : "رفض";
  return successresponse(
    res,
    `تم ${action} البائع بنجاح وإرسال إشعار له ✅`,
    200,
    {
      vendorId: vendor._id,
      fullName: vendor.fullName,
      email: vendor.email,
      previousStatus: oldStatus,
      newStatus: status,
    },
  );
});

export const loginWithPassword = asyncHandelr(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(
      new Error("البريد الإلكتروني وكلمة المرور مطلوبين", { cause: 400 }),
    );
  }

  const user = await Usermodel.findOne({ email: email.toLowerCase() });

  if (!user) {
    return next(new Error("بيانات الدخول غير صحيحة", { cause: 400 }));
  }

  const isVendor = user.accountType === "vendor";
  const isAdmin = user.accountType === "Admin";
  const isOwner = user.accountType === "Owner";

  if (!isVendor && !isAdmin && !isOwner) {
    return next(new Error("هذا الحساب غير مصرح له بالدخول", { cause: 403 }));
  }

  // للبائع: لازم يكون مفعل ومقبول
  if (isVendor) {
    if (!user.isConfirmed) {
      return next(
        new Error("الحساب غير مفعل، يرجى تفعيله أولاً عبر كود OTP", {
          cause: 400,
        }),
      );
    }
    if (user.status !== "ACCEPTED") {
      return next(new Error("طلب الانضمام لم يُقبل بعد", { cause: 400 }));
    }
  }

  // التحقق من الباسورد (التصحيح هنا)
  const isMatch = await comparehash({
    planText: password,
    valuehash: user.password,
  }); // 👈 التعديل الوحيد

  if (!isMatch) {
    return next(new Error("بيانات الدخول غير صحيحة", { cause: 400 }));
  }

  // توليد التوكنات
  const access_Token = generatetoken({ payload: { id: user._id } });
  const refreshToken = generatetoken({
    payload: { id: user._id },
    expiresIn: "365d",
  });

  let message = "";
  if (isOwner) message = "تم تسجيل دخول المالك بنجاح ✅";
  else if (isAdmin) message = "تم تسجيل دخول الأدمن بنجاح ✅";
  else if (isVendor) message = "تم تسجيل دخول البائع بنجاح ✅";

  return successresponse(res, message, 200, {
    access_Token,
    refreshToken,
    user: {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      companyName: user.companyName || null,
      accountType: user.accountType,
      status: user.status || null,
    },
  });
});

export const createCoupon = asyncHandelr(async (req, res, next) => {
  const {
    code, // اختياري: لو مش بعته، هيتولد تلقائيًا
    discountType, // "percentage" أو "fixed"
    discountValue, // رقم (1-100 للنسبة، أي رقم للثابت)
    appliesTo, // "single_product" أو "all_products"
    productId, // مطلوب لو appliesTo = single_product
    maxUses = 1, // عدد الاستخدامات (default 1)
    expiryDate, // تاريخ الانتهاء (ISO string)
    isActive = true, // حالة التفعيل
  } = req.body;

  // ✅ التحقق من وجود  الكوبون على منتج واحد → تحقق من المنتجتوكن وبائع مسجل دخول
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لإنشاء كوبون", { cause: 401 }));
  }

  if (req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بإنشاء كوبونات", { cause: 403 }));
  }

  if (req.user.status !== "ACCEPTED") {
    return next(
      new Error("❌ طلب الانضمام كبائع لم يُقبل بعد", { cause: 403 }),
    );
  }

  // ✅ التحقق من الحقول الأساسية
  if (!discountType || !["percentage", "fixed"].includes(discountType)) {
    return next(
      new Error("❌ نوع الخصم مطلوب ويجب أن يكون percentage أو fixed", {
        cause: 400,
      }),
    );
  }

  if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
    return next(
      new Error("❌ قيمة الخصم مطلوبة ويجب أن تكون رقم موجب", { cause: 400 }),
    );
  }

  if (discountType === "percentage" && Number(discountValue) > 100) {
    return next(
      new Error("❌ النسبة المئوية لا يمكن أن تتجاوز 100%", { cause: 400 }),
    );
  }

  if (
    !appliesTo ||
    !["single_product", "all_products", "category"].includes(appliesTo)
  ) {
    return next(
      new Error(
        "❌ appliesTo مطلوب ويجب أن يكون single_product أو all_products أو category",
        { cause: 400 },
      ),
    );
  }

  if (appliesTo === "category") {
    return next(
      new Error("❌ خيار appliesTo = category متاح فقط للأدمن", { cause: 403 }),
    );
  }

  // ✅ لو
  if (appliesTo === "single_product") {
    if (!productId) {
      return next(
        new Error("❌ productId مطلوب عند اختيار single_product", {
          cause: 400,
        }),
      );
    }

    const product = await ProductModellll.findOne({
      _id: productId,
      createdBy: req.user._id, // لازم يكون المنتج تابع للبائع
      isActive: true,
    });

    if (!product) {
      return next(new Error("❌ المنتج غير موجود أو لا يخصك", { cause: 404 }));
    }
  }

  // ✅ توليد كود الكوبون (لو مش بعته)
  let couponCode = code?.trim().toUpperCase();
  if (!couponCode) {
    // توليد كود عشوائي فريد: VENDORID-XXXXXX
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    couponCode = `V${req.user._id.toString().slice(-6)}${randomPart}`;
  }

  // ✅ التحقق من عدم تكرار الكود
  const existingCoupon = await CouponModel.findOne({ code: couponCode });
  if (existingCoupon) {
    return next(
      new Error("❌ كود الكوبون مستخدم بالفعل، جرب كود آخر", { cause: 409 }),
    );
  }

  // ✅ تحويل expiryDate إلى Date لو موجود
  let parsedExpiryDate = null;
  if (expiryDate) {
    parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return next(new Error("❌ تاريخ الانتهاء غير صالح", { cause: 400 }));
    }
    if (parsedExpiryDate < new Date()) {
      return next(
        new Error("❌ تاريخ الانتهاء لا يمكن أن يكون في الماضي", {
          cause: 400,
        }),
      );
    }
  }

  // ✅ إنشاء الكوبون
  const coupon = await CouponModel.create({
    code: couponCode,
    discountType,
    discountValue: Number(discountValue),
    appliesTo,
    productId: appliesTo === "single_product" ? productId : null,
    vendorId: req.user._id,
    maxUses: Math.max(1, Number(maxUses)),
    usesCount: 0,
    expiryDate: parsedExpiryDate,
    isActive: !!isActive,
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء كوبون الخصم بنجاح ✅",
    data: coupon,
  });
});

export const getMyCoupons = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من توكن وبائع
  if (!req.user || req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بعرض الكوبونات", { cause: 401 }));
  }

  const {
    page = 1,
    limit = 10,
    isActive, // true / false
    expired, // true للمنتهية، false للغير منتهية
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = { vendorId: req.user._id };

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  }

  if (expired === "true") {
    filter.expiryDate = { $lt: new Date() };
  } else if (expired === "false") {
    filter.$or = [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }];
  }

  const totalCoupons = await CouponModel.countDocuments(filter);

  const coupons = await CouponModel.find(filter)
    .populate({
      path: "productId",
      match: { isActive: true },
      select: "name sku images mainPrice",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedCoupons = coupons.map((coupon) => ({
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    appliesTo: coupon.appliesTo,
    product: coupon.productId
      ? {
          _id: coupon.productId._id,
          name: coupon.productId.name,
          sku: coupon.productId.sku,
          mainPrice: coupon.productId.mainPrice,
          image: coupon.productId.images[0] || null,
        }
      : null,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
    remainingUses: coupon.maxUses - coupon.usesCount,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
    isExpired: coupon.expiryDate
      ? new Date(coupon.expiryDate) < new Date()
      : false,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  }));

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalCoupons / limitNum),
    totalItems: totalCoupons,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalCoupons / limitNum),
    hasPrev: pageNum > 1,
  };

  // ✅ حساب الإحصائيات العامة (الإضافة الجديدة فقط)
  const stats = await CouponModel.aggregate([
    { $match: { vendorId: req.user._id } },
    {
      $group: {
        _id: null,
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        expiredCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$expiryDate", false] },
                  { $lt: ["$expiryDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalUses: { $sum: "$usesCount" },
      },
    },
  ]);

  const couponStats = stats[0] || {
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUses: 0,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب كوبوناتك بنجاح ",
    summary: {
      totalCoupons: couponStats.totalCoupons,
      activeCoupons: couponStats.activeCoupons,
      expiredCoupons: couponStats.expiredCoupons,
      totalUses: couponStats.totalUses,
    },
    count: formattedCoupons.length,
    pagination,
    data: formattedCoupons,
  });
});

export const getCouponDetails = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;

  // ✅ التحقق من توكن وبائع
  if (!req.user || req.user.accountType !== "vendor") {
    return next(
      new Error("❌ غير مصرح لك بعرض تفاصيل الكوبون", { cause: 401 }),
    );
  }

  // جلب الكوبون مع التحقق من الانتماء للبائع
  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: req.user._id,
  })
    .populate({
      path: "productId",
      match: { isActive: true },
      select: "name sku images mainPrice",
    })
    .lean();

  if (!coupon) {
    return next(new Error("❌ الكوبون غير موجود أو لا يخصك", { cause: 404 }));
  }

  // تنسيق الكوبون زي getMyCoupons
  const formattedCoupon = {
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    appliesTo: coupon.appliesTo,
    product: coupon.productId
      ? {
          _id: coupon.productId._id,
          name: coupon.productId.name,
          sku: coupon.productId.sku,
          mainPrice: coupon.productId.mainPrice,
          image: coupon.productId.images[0] || null,
        }
      : null,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
    remainingUses: coupon.maxUses - coupon.usesCount,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
    isExpired: coupon.expiryDate
      ? new Date(coupon.expiryDate) < new Date()
      : false,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };

  // ✅ حساب الإحصائيات العامة (نفس اللي في getMyCoupons، لكن لكوبون واحد)
  const stats = await CouponModel.aggregate([
    { $match: { _id: coupon._id } },
    {
      $group: {
        _id: null,
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        expiredCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$expiryDate", false] },
                  { $lt: ["$expiryDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalUses: { $sum: "$usesCount" },
      },
    },
  ]);

  const couponStats = stats[0] || {
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUses: 0,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب تفاصيل الكوبون بنجاح ",
    summary: {
      totalCoupons: couponStats.totalCoupons,
      activeCoupons: couponStats.activeCoupons,
      expiredCoupons: couponStats.expiredCoupons,
      totalUses: couponStats.totalUses,
    },
    data: formattedCoupon,
  });
});

export const updateCoupon = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;
  const { code, discountType, discountValue, maxUses, expiryDate, isActive } =
    req.body;

  if (!req.user || req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بتعديل الكوبونات", { cause: 401 }));
  }

  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: req.user._id,
  });

  if (!coupon) {
    return next(new Error("❌ الكوبون غير موجود أو لا يخصك", { cause: 404 }));
  }

  if (coupon.appliesTo === "category") {
    return next(
      new Error("❌ غير مصرح لك بتعديل كوبونات من نوع category", {
        cause: 403,
      }),
    );
  }

  // تحديث الكود (مع فحص التكرار)
  if (code) {
    const trimmedCode = code.trim().toUpperCase();
    const codeExists = await CouponModel.findOne({
      code: trimmedCode,
      _id: { $ne: couponId },
    });
    if (codeExists) {
      return next(new Error("❌ كود الكوبون مستخدم بالفعل", { cause: 409 }));
    }
    coupon.code = trimmedCode;
  }

  if (discountType) {
    if (!["percentage", "fixed"].includes(discountType)) {
      return next(new Error("❌ نوع الخصم غير صحيح", { cause: 400 }));
    }
    coupon.discountType = discountType;
  }

  if (discountValue !== undefined) {
    const value = Number(discountValue);
    if (isNaN(value) || value <= 0) {
      return next(
        new Error("❌ قيمة الخصم يجب أن تكون رقم موجب", { cause: 400 }),
      );
    }
    if (coupon.discountType === "percentage" && value > 100) {
      return next(
        new Error("❌ النسبة لا يمكن أن تتجاوز 100%", { cause: 400 }),
      );
    }
    coupon.discountValue = value;
  }

  if (maxUses !== undefined) {
    const uses = Number(maxUses);
    if (isNaN(uses) || uses < coupon.usesCount) {
      return next(
        new Error(
          `❌ عدد الاستخدامات لا يمكن أن يكون أقل من المستخدم بالفعل (${coupon.usesCount})`,
          { cause: 400 },
        ),
      );
    }
    coupon.maxUses = uses;
  }

  if (expiryDate !== undefined) {
    if (expiryDate === null) {
      coupon.expiryDate = null;
    } else {
      const date = new Date(expiryDate);
      if (isNaN(date.getTime())) {
        return next(new Error("❌ تاريخ الانتهاء غير صالح", { cause: 400 }));
      }
      coupon.expiryDate = date;
    }
  }

  if (isActive !== undefined) {
    coupon.isActive = !!isActive;
  }

  await coupon.save();

  res.status(200).json({
    success: true,
    message: "تم تعديل الكوبون بنجاح ✅",
    data: coupon,
  });
});

export const deleteCoupon = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;

  // ✅ التحقق من توكن وبائع
  if (!req.user || req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بحذف الكوبونات", { cause: 401 }));
  }

  // جلب الكوبون مع التحقق من الانتماء للبائع
  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: req.user._id,
  });

  if (!coupon) {
    return next(new Error("❌ الكوبون غير موجود أو لا يخصك", { cause: 404 }));
  }

  // حذف نهائي من الداتابيز
  await CouponModel.findByIdAndDelete(couponId);

  res.status(200).json({
    success: true,
    message: "تم حذف الكوبون نهائيًا بنجاح ✅",
    data: {
      _id: coupon._id,
      code: coupon.code,
    },
  });
});

export const createAdminCoupon = asyncHandelr(async (req, res, next) => {
  const {
    code,
    discountType, 
    discountValue, 
    appliesTo, 
    productId, 
    categoryId,
    maxUses = 1,
    expiryDate, 
    isActive = true, 
  } = req.body;

  if (!req.user) {
    return next(new Error("you have to login first", { cause: 401 }));
  }

  if (req.user.accountType !== "Admin") {
    return next(new Error("you dont have a privilege", { cause: 403 }));
  }

  if (!discountType || !["percentage", "fixed"].includes(discountType)) {
    return next(
      new Error("discount type is required and should be percentage or fixed", {
        cause: 400,
      }),
    );
  }

  if (!discountValue || isNaN(discountValue) || Number(discountValue) <= 0) {
    return next(
      new Error("discount value is required and should be postive number", { cause: 400 }),
    );
  }

  if (discountType === "percentage" && Number(discountValue) > 100) {
    return next(
      new Error("discount value should be less than 100% because it's percentage", { cause: 400 }),
    );
  }

  if (
    !appliesTo ||
    !["single_product", "category", "all_products"].includes(appliesTo)
  ) {
    return next(
      new Error(
        "appliesTo required and should be single_product or category or all_products",
        { cause: 400 },
      ),
    );
  }

  if (appliesTo === "single_product") {
    if (!productId) {
      return next(
        new Error("productId is required in case single_product", {
          cause: 400,
        }),
      );
    }

    const product = await ProductModellll.findOne({
      _id: productId,
      isActive: true,
    });

    if (!product) {
      return next(new Error("product not found", { cause: 404 }));
    }
  }

  if (appliesTo === "category") {
    if (!categoryId) {
      return next(
        new Error("categoryId is required in case category", {
          cause: 400,
        }),
      );
    }

    const category = await CategoryModellll.findOne({
      _id: categoryId,
      isActive: true,
    });

    if (!category) {
      return next(new Error("category not found", { cause: 404 }));
    }
  }

  let couponCode = code?.trim().toUpperCase();
  if (!couponCode) {
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    couponCode = `ADMIN-${randomPart}`;
  }

  const existingCoupon = await CouponModel.findOne({ code: couponCode });
  if (existingCoupon) {
    return next(
      new Error("this code is already used", { cause: 409 }),
    );
  }

  let parsedExpiryDate = null;
  if (expiryDate) {
    parsedExpiryDate = new Date(expiryDate);
    if (isNaN(parsedExpiryDate.getTime())) {
      return next(new Error("expiry date is not valid", { cause: 400 }));
    }
    if (parsedExpiryDate < new Date()) {
      return next(
        new Error("expiry date could not be in the past", {
          cause: 400,
        }),
      );
    }
  }

  const coupon = await CouponModel.create({
    code: couponCode,
    discountType,
    discountValue: Number(discountValue),
    appliesTo,
    productId: appliesTo === "single_product" ? productId : null,
    categoryId: appliesTo === "category" ? categoryId : null,
    vendorId: null,
    maxUses: Math.max(1, Number(maxUses)),
    usesCount: 0,
    expiryDate: parsedExpiryDate,
    isActive: !!isActive,
  });

  res.status(201).json({
    success: true,
    message: "the coupon code created successfully",
    data: coupon,
  });
});

export const getAdminCoupons = asyncHandelr(async (req, res, next) => {
  if (!req.user || req.user.accountType !== "Admin") {
    return next(new Error("you have not privilage to see admin coupons", { cause: 401 }));
  }

  const {
    page = 1,
    limit = 10,
    isActive, 
    expired,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = { vendorId: null };

  if (isActive !== undefined) {
    filter.isActive = isActive === "true" || isActive === true;
  }

  if (expired === "true") {
    filter.expiryDate = { $lt: new Date() };
  } else if (expired === "false") {
    filter.$or = [{ expiryDate: { $gte: new Date() } }, { expiryDate: null }];
  }

  const totalCoupons = await CouponModel.countDocuments(filter);

  const coupons = await CouponModel.find(filter)
    .populate({
      path: "productId",
      match: { isActive: true },
      select: "name sku images mainPrice",
    })
    .populate({
      path: "categoryId",
      select: "name",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedCoupons = coupons.map((coupon) => ({
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    appliesTo: coupon.appliesTo,
    product: coupon.productId
      ? {
          _id: coupon.productId._id,
          name: coupon.productId.name,
          sku: coupon.productId.sku,
          mainPrice: coupon.productId.mainPrice,
          image: coupon.productId.images[0] || null,
        }
      : null,
    category: coupon.categoryId
      ? {
          _id: coupon.categoryId._id,
          name: coupon.categoryId.name,
        }
      : null,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
    remainingUses: coupon.maxUses - coupon.usesCount,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
    isExpired: coupon.expiryDate
      ? new Date(coupon.expiryDate) < new Date()
      : false,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  }));

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalCoupons / limitNum),
    totalItems: totalCoupons,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalCoupons / limitNum),
    hasPrev: pageNum > 1,
  };

  const stats = await CouponModel.aggregate([
    { $match: { vendorId: null } },
    {
      $group: {
        _id: null,
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        expiredCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$expiryDate", false] },
                  { $lt: ["$expiryDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalUses: { $sum: "$usesCount" },
      },
    },
  ]);

  const couponStats = stats[0] || {
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUses: 0,
  };

  res.status(200).json({
    success: true,
    message: "the coupons retrived successfully",
    summary: {
      totalCoupons: couponStats.totalCoupons,
      activeCoupons: couponStats.activeCoupons,
      expiredCoupons: couponStats.expiredCoupons,
      totalUses: couponStats.totalUses,
    },
    count: formattedCoupons.length,
    pagination,
    data: formattedCoupons,
  });
});

export const getAdminCouponDetails = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;

  if (!req.user || req.user.accountType !== "Admin") {
    return next(
      new Error("you dont have a privilege", { cause: 401 }),
    );
  }

  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: null,
  })
    .populate({
      path: "productId",
      match: { isActive: true },
      select: "name sku images mainPrice",
    })
    .populate({
      path: "categoryId",
      select: "name",
    })
    .lean();

  if (!coupon) {
    return next(new Error("coupon not found", { cause: 404 }));
  }

  const formattedCoupon = {
    _id: coupon._id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    appliesTo: coupon.appliesTo,
    product: coupon.productId
      ? {
          _id: coupon.productId._id,
          name: coupon.productId.name,
          sku: coupon.productId.sku,
          mainPrice: coupon.productId.mainPrice,
          image: coupon.productId.images[0] || null,
        }
      : null,
    category: coupon.categoryId
      ? {
          _id: coupon.categoryId._id,
          name: coupon.categoryId.name,
        }
      : null,
    maxUses: coupon.maxUses,
    usesCount: coupon.usesCount,
    remainingUses: coupon.maxUses - coupon.usesCount,
    expiryDate: coupon.expiryDate,
    isActive: coupon.isActive,
    isExpired: coupon.expiryDate
      ? new Date(coupon.expiryDate) < new Date()
      : false,
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  };

  const stats = await CouponModel.aggregate([
    { $match: { _id: coupon._id } },
    {
      $group: {
        _id: null,
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        expiredCoupons: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$expiryDate", false] },
                  { $lt: ["$expiryDate", new Date()] },
                ],
              },
              1,
              0,
            ],
          },
        },
        totalUses: { $sum: "$usesCount" },
      },
    },
  ]);

  const couponStats = stats[0] || {
    totalCoupons: 0,
    activeCoupons: 0,
    expiredCoupons: 0,
    totalUses: 0,
  };

  res.status(200).json({
    success: true,
    message: "the coupon retrived successfully",
    summary: {
      totalCoupons: couponStats.totalCoupons,
      activeCoupons: couponStats.activeCoupons,
      expiredCoupons: couponStats.expiredCoupons,
      totalUses: couponStats.totalUses,
    },
    data: formattedCoupon,
  });
});

export const updateAdminCoupon = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;
  const { code, discountType, discountValue, maxUses, expiryDate, isActive } =
    req.body;

  if (!req.user || req.user.accountType !== "Admin") {
    return next(new Error("you dont have a privilege", { cause: 401 }));
  }

  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: null,
  });

  if (!coupon) {
    return next(new Error("coupon not found", { cause: 404 }));
  }

  if (code) {
    const trimmedCode = code.trim().toUpperCase();
    const codeExists = await CouponModel.findOne({
      code: trimmedCode,
      _id: { $ne: couponId },
    });
    if (codeExists) {
      return next(new Error("the coupon code is already used", { cause: 409 }));
    }
    coupon.code = trimmedCode;
  }

  if (discountType) {
    if (!["percentage", "fixed"].includes(discountType)) {
      return next(new Error("discount type should be percentage or fixed", { cause: 400 }));
    }
    coupon.discountType = discountType;
  }

  if (discountValue !== undefined) {
    const value = Number(discountValue);
    if (isNaN(value) || value <= 0) {
      return next(
        new Error("discount value should be positive number", { cause: 400 }),
      );
    }
    if (coupon.discountType === "percentage" && value > 100) {
      return next(
        new Error("discount value should be less than 100% because it's percentage", { cause: 400 }),
      );
    }
    coupon.discountValue = value;
  }

  if (maxUses !== undefined) {
    const uses = Number(maxUses);
    if (isNaN(uses) || uses < coupon.usesCount) {
      return next(
        new Error(
          `The number of uses cannot be less than what is actually used(${coupon.usesCount})`,
          { cause: 400 },
        ),
      );
    }
    coupon.maxUses = uses;
  }

  if (expiryDate !== undefined) {
    if (expiryDate === null) {
      coupon.expiryDate = null;
    } else {
      const date = new Date(expiryDate);
      if (isNaN(date.getTime())) {
        return next(new Error("expiry date is not valid", { cause: 400 }));
      }
      coupon.expiryDate = date;
    }
  }

  if (isActive !== undefined) {
    coupon.isActive = !!isActive;
  }

  await coupon.save();

  res.status(200).json({
    success: true,
    message: "the coupon was updated successfully",
    data: coupon,
  });
});

export const deleteAdminCoupon = asyncHandelr(async (req, res, next) => {
  const { couponId } = req.params;

  if (!req.user || req.user.accountType !== "Admin") {
    return next(new Error("you dont have a privilege", { cause: 401 }));
  }

  const coupon = await CouponModel.findOne({
    _id: couponId,
    vendorId: null,
  });

  if (!coupon) {
    return next(new Error("coupon not found ", { cause: 404 }));
  }

  await CouponModel.findByIdAndDelete(couponId);

  res.status(200).json({
    success: true,
    message: "the coupon was deleted successfully",
    data: {
      _id: coupon._id,
      code: coupon.code,
    },
  });
});

import { CartModel } from "../../../DB/models/cart.model.js";

export const applyCoupon = asyncHandelr(async (req, res, next) => {
  const { couponCode } = req.body;

  if (!req.user) {
    return next(
      new Error("❌ يجب تسجيل الدخول لتطبيق الكوبون", { cause: 401 }),
    );
  }

  const customerId = req.user._id;

  if (!couponCode) {
    return next(new Error("❌ كود الكوبون مطلوب", { cause: 400 }));
  }

  // جلب السلة من الداتابيز
  const cart = await CartModel.findOne({ userId: customerId })
    .populate({
      path: "items.productId",
      select:
        "name mainPrice disCountPrice createdBy categories hasVariants stock isActive status",
      match: { isActive: true, status: "published" },
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes stock isActive",
      match: { isActive: true },
    });

  if (!cart || cart.items.length === 0) {
    return next(new Error("❌ السلة فارغة أو غير موجودة", { cause: 400 }));
  }

  // فلترة العناصر الصالحة فقط (لو الـ populate match عمل شغله)
  const validItems = cart.items.filter(
    (item) => item.productId && (!item.variantId || item.variantId),
  );

  if (validItems.length === 0) {
    return next(new Error("❌ لا توجد عناصر صالحة في السلة", { cause: 400 }));
  }

  const trimmedCode = couponCode.trim().toUpperCase();

  const coupon = await CouponModel.findOne({
    code: trimmedCode,
    isActive: true,
  }).populate("productId categoryId");

  if (!coupon) {
    return next(
      new Error("❌ كود الكوبون غير صحيح أو غير مفعل", { cause: 400 }),
    );
  }

  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
    return next(new Error("❌ الكوبون منتهي الصلاحية", { cause: 400 }));
  }

  if (coupon.usesCount >= coupon.maxUses) {
    return next(
      new Error("❌ تم استنفاد عدد استخدامات هذا الكوبون", { cause: 400 }),
    );
  }

  // حساب الإجمالي والخصم
  let subtotal = 0;
  let applicableSubtotal = 0;
  let appliedItems = [];

  for (const item of validItems) {
    const product = item.productId;
    const variant = item.variantId;

    let itemPrice = 0;
    let usedDiscountPrice = false;

    // حالة 1: variant محدد
    if (variant && product.hasVariants) {
      const variantDiscount = Number(variant.disCountPrice) || 0;
      itemPrice =
        variantDiscount > 0 ? variantDiscount : Number(variant.price || 0);
      usedDiscountPrice = variantDiscount > 0;
    }
    // حالة 2: المنتج الأساسي
    else {
      const productDiscount = Number(product.disCountPrice) || 0;
      itemPrice =
        productDiscount > 0 ? productDiscount : Number(product.mainPrice || 0);
      usedDiscountPrice = productDiscount > 0;
    }

    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;

    // تحديد إذا كان الكوبون ينطبق على هذا العنصر
    let isApplicable = false;

    // التحقق الأساسي بناءً على appliesTo
    if (coupon.appliesTo === "all_products") {
      isApplicable = true;
    } else if (coupon.appliesTo === "single_product") {
      if (
        coupon.productId &&
        coupon.productId._id.toString() === product._id.toString()
      ) {
        isApplicable = true;
      }
    } else if (coupon.appliesTo === "category") {
      if (
        coupon.categoryId &&
        product.categories.some(
          (cat) => cat.toString() === coupon.categoryId._id.toString(),
        )
      ) {
        isApplicable = true;
      }
    }

    // التحقق الإضافي للـ vendorId (لو الكوبون للبائع، يجب أن يكون المنتج له)
    if (isApplicable && coupon.vendorId) {
      if (
        !product.createdBy ||
        product.createdBy.toString() !== coupon.vendorId.toString()
      ) {
        isApplicable = false;
      }
    }

    if (isApplicable) {
      applicableSubtotal += itemTotal;

      appliedItems.push({
        productId: product._id,
        productName: product.name,
        variantId: variant?._id || null,
        variantAttributes: variant ? variant.attributes : null,
        isBaseProduct: !item.variantId,
        quantity: item.quantity,
        unitPrice: itemPrice,
        wasDiscounted: usedDiscountPrice,
        itemTotal,
      });
    }
  }

  if (applicableSubtotal === 0) {
    return next(
      new Error("❌ هذا الكوبون لا ينطبق على أي منتج في سلتك", { cause: 400 }),
    );
  }

  // حساب الخصم
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
  } else if (coupon.discountType === "fixed") {
    discountAmount = Math.min(coupon.discountValue, applicableSubtotal);
  }

  const totalAfterDiscount = subtotal - discountAmount;

  res.status(200).json({
    success: true,
    message: "تم تطبيق الكوبون بنجاح ",
    data: {
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        appliesTo: coupon.appliesTo,
        appliedOn:
          coupon.appliesTo === "single_product"
            ? coupon.productId?.name || "منتج محدد"
            : coupon.appliesTo === "category"
              ? coupon.categoryId?.name || "فئة محددة"
              : "جميع المنتجات",
        remainingUses: coupon.maxUses - coupon.usesCount - 1,
      },
      cartSummary: {
        subtotal: Number(subtotal.toFixed(2)),
        applicableSubtotal: Number(applicableSubtotal.toFixed(2)),
        discountAmount: Number(discountAmount.toFixed(2)),
        totalAfterDiscount: Number(totalAfterDiscount.toFixed(2)),
      },
      appliedItems: appliedItems,
    },
  });
});

export const createOrderforUser = asyncHandelr(async (req, res, next) => {
  const { cartItems, couponCode, paymentMethod, shippingAddress } = req.body;

  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لإنشاء طلب", { cause: 401 }));
  }

  const customerId = req.user._id;

  if (!cartItems || cartItems.length === 0) {
    return next(new Error("❌ السلة فارغة", { cause: 400 }));
  }

  if (
    !shippingAddress ||
    !shippingAddress.latitude ||
    !shippingAddress.longitude
  ) {
    return next(
      new Error("❌ عنوان التوصيل وإحداثياته مطلوبة", { cause: 400 }),
    );
  }

  // جلب المنتجات الفريدة
  const productIds = [...new Set(cartItems.map((item) => item.productId))];
  const products = await ProductModellll.find({
    _id: { $in: productIds },
    isActive: true,
    status: "published",
  }).lean();

  if (products.length !== productIds.length) {
    return next(
      new Error("❌ واحد أو أكثر من المنتجات غير موجود أو غير متاح", {
        cause: 400,
      }),
    );
  }

  const productsMap = {};
  products.forEach((p) => (productsMap[p._id.toString()] = p));

  // جلب الـ variants
  const variantIds = cartItems
    .filter((item) => item.variantId)
    .map((item) => item.variantId);
  let variantsMap = {};
  if (variantIds.length > 0) {
    const variants = await VariantModel.find({
      _id: { $in: variantIds },
      isActive: true,
    }).lean();

    variants.forEach((v) => (variantsMap[v._id.toString()] = v));
  }

  // ✅ تحديد vendorId + حساب الإجمالي
  let vendorId = null;
  let subtotal = 0;
  let formattedItems = [];
  let coupon = null;
  let discountAmount = 0;
  let applicableSubtotal = 0;

  for (const item of cartItems) {
    const product = productsMap[item.productId?.toString()];
    if (!product) continue;

    // تحديد vendorId من المنتج
    if (!vendorId) {
      vendorId = product.createdBy;
    } else if (vendorId.toString() !== product.createdBy.toString()) {
      return next(
        new Error("❌ لا يمكن دمج منتجات من بائعين مختلفين في طلب واحد", {
          cause: 400,
        }),
      );
    }

    let variant = null;
    let basePrice = Number(product.mainPrice) || 0;
    let discountPrice = Number(product.disCountPrice) || 0;

    if (item.variantId && product.hasVariants) {
      variant = variantsMap[item.variantId?.toString()];
      if (variant) {
        basePrice = Number(variant.price) || basePrice;
        discountPrice = Number(variant.disCountPrice) || discountPrice;
      }
    }

    const applicablePrice = discountPrice > 0 ? discountPrice : basePrice;
    const itemTotal = applicablePrice * item.quantity;
    subtotal += itemTotal;

    formattedItems.push({
      productId: product._id,
      variantId: variant?._id || null,
      productName: product.name,
      variantAttributes: variant ? variant.attributes : null,
      quantity: item.quantity,
      unitPrice: applicablePrice,
      totalPrice: itemTotal,
    });
  }

  // ✅ تطبيق الكوبون
  if (couponCode) {
    const trimmedCode = couponCode.trim().toUpperCase();

    coupon = await CouponModel.findOne({
      code: trimmedCode,
      isActive: true,
      vendorId: vendorId, // الكوبون لازم يكون تابع لنفس البائع
    }).populate("productId");

    if (!coupon) {
      return next(
        new Error("❌ كود الكوبون غير صحيح أو غير مفعل أو لا يخص هذا البائع", {
          cause: 400,
        }),
      );
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      return next(new Error("❌ الكوبون منتهي الصلاحية", { cause: 400 }));
    }

    if (coupon.usesCount >= coupon.maxUses) {
      return next(
        new Error("❌ تم استنفاد عدد استخدامات هذا الكوبون", { cause: 400 }),
      );
    }

    let isApplicable = false;
    if (coupon.appliesTo === "all_products") {
      isApplicable = true;
      applicableSubtotal = subtotal;
    } else if (coupon.appliesTo === "single_product") {
      const itemsFromProduct = formattedItems.filter(
        (i) => i.productId.toString() === coupon.productId._id.toString(),
      );
      if (itemsFromProduct.length > 0) {
        isApplicable = true;
        applicableSubtotal = itemsFromProduct.reduce(
          (sum, i) => sum + i.totalPrice,
          0,
        );
      }
    }

    if (!isApplicable) {
      return next(
        new Error("❌ هذا الكوبون لا ينطبق على منتجات سلتك", { cause: 400 }),
      );
    }

    if (coupon.discountType === "percentage") {
      discountAmount = (applicableSubtotal * coupon.discountValue) / 100;
    } else if (coupon.discountType === "fixed") {
      discountAmount = Math.min(coupon.discountValue, applicableSubtotal);
    }

    coupon.usesCount += 1;
    await coupon.save();
  }

  const shippingCost = 0;
  const totalAmount = subtotal - discountAmount + shippingCost;

  // توليد orderNumber ديناميكي
  const date = new Date();
  const year = date.getFullYear();
  const count = await OrderModelUser.countDocuments({
    createdAt: { $gte: new Date(year, 0, 1) },
  });
  const orderNumber = `ORDER-${year}-${String(count + 1).padStart(4, "0")}`;

  // إنشاء الطلب
  const order = await OrderModelUser.create({
    orderNumber,
    paymentMethod,
    customerId,
    vendorId, // من createdBy بتاع المنتج
    items: formattedItems,
    subtotal: Number(subtotal.toFixed(2)),
    discountAmount: Number(discountAmount.toFixed(2)),
    couponUsed: coupon
      ? {
          couponId: coupon._id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
        }
      : null,
    shippingCost,
    totalAmount: Number(totalAmount.toFixed(2)),
    currency: "USD",
    shippingAddress,
    paymentStatus: "pending",
    status: "pending",
  });

  res.status(201).json({
    success: true,
    message: "تم إنشاء الطلب بنجاح، في انتظار الدفع ✅",
    data: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      paymentStatus: "pending",
      nextStep: "انتقل إلى بوابة الدفع Payoneer",
    },
  });
});

export const GetMyOrders = asyncHandelr(async (req, res, next) => {
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول لعرض طلباتك", { cause: 401 }));
  }

  const customerId = req.user._id;

  const { page = 1, limit = 10, delivered = false } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = {
    customerId,
    paymentStatus: "paid",
  };

  if (delivered === "true") {
    filter.shippingStatus = "delivered";
  }

  const totalOrders = await OrderModelUser.countDocuments(filter);

  const orders = await OrderModelUser.find(filter)
    .populate({
      path: "items.productId",
      select: "name sku images mainPrice disCountPrice",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes images weight sku",
      populate: [
        { path: "attributes.attributeId", select: "name type" },
        { path: "attributes.valueId", select: "value hexCode" },
      ],
    })
    .populate("couponUsed.couponId", "code discountType discountValue")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedOrders = orders.map((order) => {
    const items = order.items.map((item) => {
      const product = item.productId;
      const variant = item.variantId;

      if (variant) {
        const variantAttributes = variant.attributes.map((attr) => ({
          name: attr.attributeId?.name || { ar: "غير معروف", en: "Unknown" },
          type: attr.attributeId?.type || "text",
          value: attr.valueId?.value || { ar: "غير معروف", en: "Unknown" },
          hexCode: attr.valueId?.hexCode || null,
        }));

        return {
          productId: product?._id,
          productName: item.productName,
          variantId: variant._id,
          variantAttributes,
          variantImages: variant.images || null,
          variantSku: variant.sku || null,
          variantWeight: variant.weight || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        };
      }

      // بدون variant → بيانات المنتج الأساسي
      return {
        productId: product?._id,
        productName: item.productName,
        variantId: null,
        variantAttributes: null,
        variantImages: product?.images || null,
        variantSku: product?.sku || null,
        variantWeight: variant ? variant.weight : product?.weight || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      };
    });

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      shippingMethod: order.shippingMethod,
      shippingDetails: order.shippingDetails,
      status: order.status,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items,
      discountAmount: order.discountAmount,
      couponUsed: order.couponUsed,
      shippingCost: order.shippingCost,
    };
  });
  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalOrders / limitNum),
    totalItems: totalOrders,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalOrders / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب طلباتك المدفوعة بنجاح ✅",
    count: formattedOrders.length,
    pagination,
    data: formattedOrders,
  });
});

export const getVendorOrders = asyncHandelr(async (req, res, next) => {
  if (!req.user || req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بعرض الطلبات", { cause: 403 }));
  }

  const vendorId = req.user._id;

  const {
    page = 1,
    limit = 10,
    paymentStatus,
    shippingStatus,
    status,
    orderNumber,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = { vendorId };

  if (paymentStatus) {
    const validPayment = ["pending", "paid", "failed", "refunded"];
    if (!validPayment.includes(paymentStatus)) {
      return next(new Error("❌ حالة الدفع غير صحيحة", { cause: 400 }));
    }
    filter.paymentStatus = paymentStatus;
  }

  if (shippingStatus) {
    const validShipping = [
      "not_shipped",
      "preparing",
      "shipped",
      "in_transit",
      "delivered",
      "failed",
    ];
    if (!validShipping.includes(shippingStatus)) {
      return next(new Error("❌ حالة الشحن غير صحيحة", { cause: 400 }));
    }
    filter.shippingStatus = shippingStatus;
  }

  if (status) {
    const validStatus = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatus.includes(status)) {
      return next(new Error("❌ حالة الطلب غير صحيحة", { cause: 400 }));
    }
    filter.status = status;
  }

  if (orderNumber) {
    filter.orderNumber = { $regex: orderNumber.trim(), $options: "i" };
  }

  // ✅ حساب الإحصائيات العامة

  const statsAggregation = await OrderModelUser.aggregate([
    { $match: { vendorId } },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalPendingAmount: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$totalAmount", 0],
          },
        },
      },
    },
  ]);

  let pendingCount = 0;
  let pendingAmount = 0;
  let paidCount = 0;
  let refundedCount = 0;
  let failedCount = 0;

  statsAggregation.forEach((stat) => {
    if (stat._id === "pending") {
      pendingCount = stat.count;
      pendingAmount = stat.totalPendingAmount;
    } else if (stat._id === "paid") {
      paidCount = stat.count;
    } else if (stat._id === "refunded") {
      refundedCount = stat.count;
    } else if (stat._id === "failed") {
      failedCount = stat.count;
    }
  });

  const totalOrders = await OrderModelUser.countDocuments(filter);

  const orders = await OrderModelUser.find(filter)
    .populate("customerId", "fullName email phone")
    .populate({
      path: "items.productId",
      select: "name sku images mainPrice disCountPrice",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes images weight sku",
      populate: [
        { path: "attributes.attributeId", select: "name type" },
        { path: "attributes.valueId", select: "value hexCode" },
      ],
    })
    .populate("couponUsed.couponId", "code discountType discountValue")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedOrders = orders.map((order) => {
    const items = order.items.map((item) => {
      const product = item.productId;
      const variant = item.variantId;

      let variantFormattedAttributes = null;
      let variantImages = product?.images || null;
      let variantSku = product?.sku || null;
      let variantWeight = product?.weight || null;
      let vendorAddress = item.vendorAddress;

      if (variant) {
        variantFormattedAttributes = variant.attributes.map((attr) => ({
          name: attr.attributeId?.name || { ar: "غير معروف", en: "Unknown" },
          type: attr.attributeId?.type || "text",
          value: attr.valueId?.value || { ar: "غير معروف", en: "Unknown" },
          hexCode: attr.valueId?.hexCode || null,
        }));
        variantImages = variant.images || null;
        variantSku = variant.sku || null;
        variantWeight = variant.weight || null;
      }

      return {
        productId: product?._id,
        productName: item.productName,
        variantId: variant?._id || null,
        variantAttributes: variantFormattedAttributes,
        variantImages,
        vendorAddress,
        variantSku,
        variantWeight,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      };
    });

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: {
        _id: order.customerId?._id,
        fullName: order.customerId?.fullName,
        email: order.customerId?.email,
        phone: order.customerId?.phone,
      },
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      shippingMethod: order.shippingMethod,
      shippingDetails: order.shippingDetails,
      status: order.status,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items,
      discountAmount: order.discountAmount,
      couponUsed: order.couponUsed,
      shippingCost: order.shippingCost,
    };
  });

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalOrders / limitNum),
    totalItems: totalOrders,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalOrders / limitNum),
    hasPrev: pageNum > 1,
  };

  // ✅ الإحصائيات العامة
  const summary = {
    pendingPayment: {
      count: pendingCount,
      totalAmount: pendingAmount,
    },
    completed: paidCount, // paid = completed
    refunded: refundedCount,
    failed: failedCount,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب طلباتك بنجاح ✅",
    summary,
    count: formattedOrders.length,
    pagination,
    data: formattedOrders,
  });
});

export const getAllOrdersAdmin = asyncHandelr(async (req, res, next) => {
  if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
    return next(new Error("❌ غير مصرح لك بعرض الطلبات", { cause: 403 }));
  }

  const {
    page = 1,
    limit = 10,
    paymentStatus,
    shippingStatus,
    status,
    orderNumber,
    vendorId, // اختياري: فلتر بتاجر معين
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = {};

  // فلتر اختياري بتاجر معين
  if (vendorId) {
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new Error("❌ معرف التاجر غير صحيح", { cause: 400 }));
    }
    filter.vendorId = vendorId;
  }

  if (paymentStatus) {
    const validPayment = ["pending", "paid", "failed", "refunded"];
    if (!validPayment.includes(paymentStatus)) {
      return next(new Error("❌ حالة الدفع غير صحيحة", { cause: 400 }));
    }
    filter.paymentStatus = paymentStatus;
  }

  if (shippingStatus) {
    const validShipping = [
      "not_shipped",
      "preparing",
      "shipped",
      "in_transit",
      "delivered",
      "failed",
    ];
    if (!validShipping.includes(shippingStatus)) {
      return next(new Error("❌ حالة الشحن غير صحيحة", { cause: 400 }));
    }
    filter.shippingStatus = shippingStatus;
  }

  if (status) {
    const validStatus = [
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (!validStatus.includes(status)) {
      return next(new Error("❌ حالة الطلب غير صحيحة", { cause: 400 }));
    }
    filter.status = status;
  }

  if (orderNumber) {
    filter.orderNumber = { $regex: orderNumber.trim(), $options: "i" };
  }

  // ✅ حساب الإحصائيات العامة (لكل النظام أو للتاجر المفلتر)
  const statsAggregation = await OrderModelUser.aggregate([
    { $match: filter },
    {
      $group: {
        _id: "$paymentStatus",
        count: { $sum: 1 },
        totalPendingAmount: {
          $sum: {
            $cond: [{ $eq: ["$paymentStatus", "pending"] }, "$totalAmount", 0],
          },
        },
      },
    },
  ]);

  let pendingCount = 0;
  let pendingAmount = 0;
  let paidCount = 0;
  let refundedCount = 0;
  let failedCount = 0;

  statsAggregation.forEach((stat) => {
    if (stat._id === "pending") {
      pendingCount = stat.count;
      pendingAmount = stat.totalPendingAmount;
    } else if (stat._id === "paid") {
      paidCount = stat.count;
    } else if (stat._id === "refunded") {
      refundedCount = stat.count;
    } else if (stat._id === "failed") {
      failedCount = stat.count;
    }
  });

  // عدد الطلبات الكلي للـ pagination
  const totalOrders = await OrderModelUser.countDocuments(filter);

  const orders = await OrderModelUser.find(filter)
    .populate("customerId", "fullName email phone")
    .populate("vendorId", "fullName companyName") // إضافة اسم التاجر
    .populate({
      path: "items.productId",
      select: "name sku images mainPrice disCountPrice",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes images weight sku",
      populate: [
        { path: "attributes.attributeId", select: "name type" },
        { path: "attributes.valueId", select: "value hexCode" },
      ],
    })
    .populate("couponUsed.couponId", "code discountType discountValue")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedOrders = orders.map((order) => {
    const items = order.items.map((item) => {
      const product = item.productId;
      const variant = item.variantId;

      let variantFormattedAttributes = null;
      let variantImages = product?.images || null;
      let variantSku = product?.sku || null;
      let variantWeight = product?.weight || null;

      if (variant) {
        variantFormattedAttributes = variant.attributes.map((attr) => ({
          name: attr.attributeId?.name || { ar: "غير معروف", en: "Unknown" },
          type: attr.attributeId?.type || "text",
          value: attr.valueId?.value || { ar: "غير معروف", en: "Unknown" },
          hexCode: attr.valueId?.hexCode || null,
        }));
        variantImages = variant.images || null;
        variantSku = variant.sku || null;
        variantWeight = variant.weight || null;
      }

      return {
        productId: product?._id,
        productName: item.productName,
        variantId: variant?._id || null,
        variantAttributes: variantFormattedAttributes,
        variantImages,
        variantSku,
        variantWeight,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      };
    });

    return {
      _id: order._id,
      orderNumber: order.orderNumber,
      vendor: {
        _id: order.vendorId?._id,
        fullName: order.vendorId?.fullName,
        companyName: order.vendorId?.companyName,
      },
      customer: {
        _id: order.customerId?._id,
        fullName: order.customerId?.fullName,
        email: order.customerId?.email,
        phone: order.customerId?.phone,
      },
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      shippingStatus: order.shippingStatus,
      shippingMethod: order.shippingMethod,
      shippingDetails: order.shippingDetails,
      status: order.status,
      shippingAddress: order.shippingAddress,
      createdAt: order.createdAt,
      items,
      discountAmount: order.discountAmount,
      couponUsed: order.couponUsed,
      shippingCost: order.shippingCost,
    };
  });

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalOrders / limitNum),
    totalItems: totalOrders,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalOrders / limitNum),
    hasPrev: pageNum > 1,
  };

  const summary = {
    pendingPayment: {
      count: pendingCount,
      totalAmount: pendingAmount,
    },
    completed: paidCount,
    refunded: refundedCount,
    failed: failedCount,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب جميع الطلبات بنجاح ",
    summary,
    count: formattedOrders.length,
    pagination,
    data: formattedOrders,
  });
});

export const getOrderDetails = asyncHandelr(async (req, res, next) => {
  const { orderId } = req.params;

  // ✅ التحقق من تسجيل الدخول
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول", { cause: 401 }));
  }

  // جلب الطلب مع التحقق من الانتماء للبائع
  const order = await OrderModelUser.findOne({
    _id: orderId,
    vendorId: req.user._id, // البائع يشوف طلباته بس
  })
    .populate("customerId", "fullName email phone")
    .populate({
      path: "items.productId",
      select: "name sku images mainPrice disCountPrice",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes images weight sku",
      populate: [
        { path: "attributes.attributeId", select: "name type" },
        { path: "attributes.valueId", select: "value hexCode" },
      ],
    })
    .populate("couponUsed.couponId", "code discountType discountValue")
    .lean();

  if (!order) {
    return next(new Error("❌ الطلب غير موجود أو لا يخصك", { cause: 404 }));
  }

  // تنسيق الـ items زي getVendorOrders
  const items = order.items.map((item) => {
    const product = item.productId;
    const variant = item.variantId;

    let variantFormattedAttributes = null;
    let variantImages = product?.images || null;
    let variantSku = product?.sku || null;
    let variantWeight = product?.weight || null;

    if (variant) {
      variantFormattedAttributes = variant.attributes.map((attr) => ({
        name: attr.attributeId?.name || { ar: "غير معروف", en: "Unknown" },
        type: attr.attributeId?.type || "text",
        value: attr.valueId?.value || { ar: "غير معروف", en: "Unknown" },
        hexCode: attr.valueId?.hexCode || null,
      }));
      variantImages = variant.images || null;
      variantSku = variant.sku || null;
      variantWeight = variant.weight || null;
    }

    return {
      productId: product?._id,
      productName: item.productName,
      variantId: variant?._id || null,
      variantAttributes: variantFormattedAttributes,
      variantImages,
      variantSku,
      variantWeight,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  });

  const formattedOrder = {
    _id: order._id,
    orderNumber: order.orderNumber,
    customer: {
      _id: order.customerId?._id,
      fullName: order.customerId?.fullName,
      email: order.customerId?.email,
      phone: order.customerId?.phone,
    },
    totalAmount: order.totalAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus,
    shippingMethod: order.shippingMethod,
    shippingDetails: order.shippingDetails,
    status: order.status,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    items,
    discountAmount: order.discountAmount,
    couponUsed: order.couponUsed,
    shippingCost: order.shippingCost,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب تفاصيل الطلب بنجاح ",
    data: formattedOrder,
  });
});

export const getOrderDetailsAdmin = asyncHandelr(async (req, res, next) => {
  const { orderId } = req.params;

  // ✅ صلاحية أدمن فقط
  if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
    return next(new Error("❌ غير مصرح لك بعرض تفاصيل الطلب", { cause: 403 }));
  }

  // جلب الطلب بدون شرط vendorId
  const order = await OrderModelUser.findById(orderId)
    .populate("customerId", "fullName email phone")
    .populate("vendorId", "fullName companyName") // إضافة معلومات التاجر
    .populate({
      path: "items.productId",
      select: "name sku images mainPrice disCountPrice",
    })
    .populate({
      path: "items.variantId",
      select: "price disCountPrice attributes images weight sku",
      populate: [
        { path: "attributes.attributeId", select: "name type" },
        { path: "attributes.valueId", select: "value hexCode" },
      ],
    })
    .populate("couponUsed.couponId", "code discountType discountValue")
    .lean();

  if (!order) {
    return next(new Error("❌ الطلب غير موجود", { cause: 404 }));
  }

  // تنسيق الـ items نفس الطريقة
  const items = order.items.map((item) => {
    const product = item.productId;
    const variant = item.variantId;

    let variantFormattedAttributes = null;
    let variantImages = product?.images || null;
    let variantSku = product?.sku || null;
    let variantWeight = product?.weight || null;

    if (variant) {
      variantFormattedAttributes = variant.attributes.map((attr) => ({
        name: attr.attributeId?.name || { ar: "غير معروف", en: "Unknown" },
        type: attr.attributeId?.type || "text",
        value: attr.valueId?.value || { ar: "غير معروف", en: "Unknown" },
        hexCode: attr.valueId?.hexCode || null,
      }));
      variantImages = variant.images || null;
      variantSku = variant.sku || null;
      variantWeight = variant.weight || null;
    }

    return {
      productId: product?._id,
      productName: item.productName,
      variantId: variant?._id || null,
      variantAttributes: variantFormattedAttributes,
      variantImages,
      variantSku,
      variantWeight,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    };
  });

  const formattedOrder = {
    _id: order._id,
    orderNumber: order.orderNumber,
    vendor: {
      _id: order.vendorId?._id,
      fullName: order.vendorId?.fullName,
      companyName: order.vendorId?.companyName,
    },
    customer: {
      _id: order.customerId?._id,
      fullName: order.customerId?.fullName,
      email: order.customerId?.email,
      phone: order.customerId?.phone,
    },
    totalAmount: order.totalAmount,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    shippingStatus: order.shippingStatus,
    shippingMethod: order.shippingMethod,
    shippingDetails: order.shippingDetails,
    status: order.status,
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt,
    items,
    discountAmount: order.discountAmount,
    couponUsed: order.couponUsed,
    shippingCost: order.shippingCost,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب تفاصيل الطلب بنجاح ",
    data: formattedOrder,
  });
});

export const getVendorDashboardStats = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من توكن وبائع
  if (!req.user || req.user.accountType !== "vendor") {
    return next(new Error("❌ غير مصرح لك بعرض الإحصائيات", { cause: 403 }));
  }

  const vendorId = req.user._id;

  // تاريخ اليوم والشهر
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // aggregation لكل الإحصائيات في استعلام واحد (أداء عالي)
  const stats = await OrderModelUser.aggregate([
    { $match: { vendorId, paymentStatus: "paid" } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" }, // إجمالي المبيعات
        totalOrders: { $sum: 1 },
        dailySales: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfDay] }, "$totalAmount", 0],
          },
        },
        monthlySales: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalAmount", 0],
          },
        },
        dailyOrders: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfDay] }, 1, 0],
          },
        },
        monthlyOrders: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0],
          },
        },
      },
    },
  ]);

  const orderStats = stats[0] || {
    totalSales: 0,
    totalOrders: 0,
    dailySales: 0,
    monthlySales: 0,
    dailyOrders: 0,
    monthlyOrders: 0,
  };

  // عدد العملاء الفريدين
  const uniqueCustomers = await OrderModelUser.distinct("customerId", {
    vendorId,
    paymentStatus: "paid",
  });
  const totalCustomers = uniqueCustomers.length;

  // عدد المنتجات اللي ليها طلبات مدفوعة
  const productsSold = await OrderModelUser.aggregate([
    { $match: { vendorId, paymentStatus: "paid" } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId" } },
    { $count: "uniqueProducts" },
  ]);
  const totalProductsSold = productsSold[0]?.uniqueProducts || 0;

  // الإيرادات = المبيعات - تكلفة الشحن - العمولة (افتراضيًا 10% عمولة منصة)
  const platformCommissionRate = 0.1; // 10%
  const totalRevenue = orderStats.totalSales * (1 - platformCommissionRate);

  // تنسيق الأرقام (k للآلاف)
  const formatNumber = (num) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(3) + "k";
    }
    return num.toString();
  };

  const summary = {
    totalSales: formatNumber(orderStats.totalSales || 230000), // مثال 230k
    totalCustomers: formatNumber(totalCustomers || 8549), // مثال 8.549k
    totalProductsSold: formatNumber(totalProductsSold || 1423), // مثال 1.423k
    totalRevenue: "$" + (totalRevenue || 9745).toFixed(0), // مثال $9745

    today: {
      sales: orderStats.dailySales || 0,
      orders: orderStats.dailyOrders || 0,
    },
    thisMonth: {
      sales: orderStats.monthlySales || 0,
      orders: orderStats.monthlyOrders || 0,
    },
  };

  res.status(200).json({
    success: true,
    message: "تم جلب إحصائيات لوحة التحكم بنجاح ",
    data: summary,
  });
});

export const getCustomersWithOrders = asyncHandelr(async (req, res, next) => {
  // ✅ التحقق من توكن وصلاحية (أدمن أو بائع)
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول", { cause: 401 }));
  }

  const isAdmin =
    req.user.accountType === "Admin" || req.user.accountType === "Owner";
  const isVendor = req.user.accountType === "vendor";

  if (!isAdmin && !isVendor) {
    return next(new Error("❌ غير مصرح لك بعرض العملاء", { cause: 403 }));
  }

  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  // فلتر أساسي: طلبات مدفوعة
  let matchFilter = { paymentStatus: "paid" };

  // لو بائع → فقط طلباته
  if (isVendor) {
    matchFilter.vendorId = req.user._id;
  }

  // Aggregation لجلب العملاء الفريدين + حساب الإجماليات
  const customersAggregation = await OrderModelUser.aggregate([
    { $match: matchFilter },
    {
      $group: {
        _id: "$customerId",
        totalOrders: { $sum: 1 },
        totalSpent: { $sum: "$totalAmount" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "customerDetails",
      },
    },
    { $unwind: "$customerDetails" },
    {
      $project: {
        _id: 0,
        customerId: "$_id",
        fullName: "$customerDetails.fullName",
        email: "$customerDetails.email",
        phone: "$customerDetails.phone",
        totalOrders: 1,
        totalSpent: 1,
      },
    },
    { $sort: { totalSpent: -1 } }, // ترتيب تنازلي حسب الفلوس
    { $skip: skip },
    { $limit: limitNum },
  ]);

  // عدد العملاء الكلي
  const totalUniqueCustomers = await OrderModelUser.distinct(
    "customerId",
    matchFilter,
  ).length;

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalUniqueCustomers / limitNum),
    totalItems: totalUniqueCustomers,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalUniqueCustomers / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب العملاء مع إجمالياتهم بنجاح ",
    count: customersAggregation.length,
    pagination,
    data: customersAggregation,
  });
});

export const getAllVendorsWithStats = asyncHandelr(async (req, res, next) => {
  // التحقق من صلاحية الأدمن
  // if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بعرض إحصائيات التجار", { cause: 403 }));
  // }

  const {
    page = 1,
    limit = 10,
    sortBy = "sales", // sales, rating, orders
    period = "all", // all, monthly
    status, // فلتر جديد: ACCEPTED, PENDING, REFUSED, SUSPENDED
    search, // فلتر جديد: بحث بالاسم أو الإيميل
    categoryId, // فلتر جديد: بحث بالقسم (ID)
    lang = "en",
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const now = new Date();
  const startOfMonth =
    period === "monthly"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(0);

  // إحصائيات الطلبات الكلية
  const globalOrderStats = await OrderModelUser.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        monthlySales: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalAmount", 0],
          },
        },
        monthlyOrders: {
          $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] },
        },
      },
    },
  ]);

  const orderStats = globalOrderStats[0] || {
    totalSales: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    monthlySales: 0,
    monthlyOrders: 0,
  };

  // إحصائيات التجار
  const totalVendors = await Usermodel.countDocuments({
    accountType: "vendor",
  });
  const activeVendors = await Usermodel.countDocuments({
    accountType: "vendor",
    status: "ACCEPTED",
  });
  const pendingVendors = await Usermodel.countDocuments({
    accountType: "vendor",
    status: "PENDING",
  });
  const suspendedVendors = await Usermodel.countDocuments({
    accountType: "vendor",
    $or: [{ status: "REFUSED" }, { status: "SUSPENDED" }],
  });
  const newThisMonth = await Usermodel.countDocuments({
    accountType: "vendor",
    createdAt: { $gte: startOfMonth },
  });

  // إجمالي المنتجات
  const totalProducts = await ProductModellll.countDocuments({
    isActive: true,
  });

  // عمولة المنصة
  const platformCommissionRate = 0.05;
  const commissionDue = orderStats.totalSales * platformCommissionRate;

  // متوسطات شهرية
  const avgMonthlySales = orderStats.monthlySales;
  const avgMonthlyOrders = orderStats.monthlyOrders;
  const avgOrderValue =
    avgMonthlyOrders > 0 ? avgMonthlySales / avgMonthlyOrders : 0;

  // معدلات الأداء
  const completionRate =
    orderStats.totalOrders > 0
      ? ((orderStats.completedOrders / orderStats.totalOrders) * 100).toFixed(
          1,
        ) + "%"
      : "0%";
  const cancellationRate =
    orderStats.totalOrders > 0
      ? ((orderStats.cancelledOrders / orderStats.totalOrders) * 100).toFixed(
          1,
        ) + "%"
      : "0%";

  // المنتجات الأكثر مبيعًا
  const topProductsAggregation = await OrderModelUser.aggregate([
    { $match: { paymentStatus: "paid" } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        salesCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { salesCount: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: ProductModellll.collection.name, // ده الأفضل والأكيد
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: {
          $ifNull: [
            "$product.name.ar",
            { $ifNull: ["$product.name.en", "منتج غير معروف"] },
          ],
        },
        sales: "$salesCount",
      },
    },
  ]);

  const topProducts = topProductsAggregation.map((p, index) => ({
    rank: index + 1,
    name: p.name,
    sales: p.sales,
  }));

  // إحصائيات عامة حقيقية
  const overallStats = {
    totalSales:
      orderStats.totalSales > 0
        ? `${orderStats.totalSales.toLocaleString()} ر.س`
        : "0 ر.س",
    commissionDue:
      commissionDue > 0 ? `${commissionDue.toFixed(0)} ر.س` : "0 ر.س",
    commissionRate: "5% من المبيعات",
    totalOrders: orderStats.totalOrders,
    completedOrders: orderStats.completedOrders,
    totalProducts,
    monthlyAvg: {
      sales:
        avgMonthlySales > 0
          ? `${avgMonthlySales.toLocaleString()} ر.س`
          : "0 ر.س",
      orders: `${avgMonthlyOrders} طلب`,
      avgOrderValue: `${avgOrderValue.toFixed(0)} ر.س`,
    },
    topProducts: topProducts.length > 0 ? topProducts : [],
    performance: {
      completionRate,
      cancellationRate,
    },
    vendorsSummary: {
      totalVendors,
      activeVendors,
      pendingVendors,
      newThisMonth,
      suspendedVendors,
    },
  };

  // إحصائيات كل بائع
  const vendorStats = await OrderModelUser.aggregate([
    { $match: { paymentStatus: "paid" } },
    {
      $group: {
        _id: "$vendorId",
        totalSales: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        monthlySales: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalAmount", 0],
          },
        },
        monthlyOrders: {
          $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] },
        },
      },
    },
  ]);

  const statsMap = {};
  vendorStats.forEach((stat) => {
    statsMap[stat._id.toString()] = stat;
  });

  // متوسط التقييم وعدد المنتجات
  const productStats = await ProductModellll.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$createdBy",
        productCount: { $sum: 1 },
        avgRating: { $avg: "$rating.average" },
      },
    },
  ]);

  const productMap = {};
  productStats.forEach((p) => {
    productMap[p._id.toString()] = {
      productCount: p.productCount,
      avgRating: p.avgRating ? Number(p.avgRating.toFixed(1)) : 0,
    };
  });

  // جلب التجار مع فلترة جديدة
  let vendorsQuery = Usermodel.find({ accountType: "vendor" });

  // فلتر الحالة
  if (status) {
    const validStatuses = ["ACCEPTED", "PENDING", "REFUSED", "SUSPENDED"];
    if (!validStatuses.includes(status)) {
      return next(
        new Error(
          "حالة غير صحيحة: استخدم ACCEPTED, PENDING, REFUSED, SUSPENDED",
          { cause: 400 },
        ),
      );
    }
    vendorsQuery = vendorsQuery.where("status", status);
  }

  // بحث بالاسم أو الإيميل
  if (search) {
    const searchRegex = new RegExp(search.trim(), "i");
    vendorsQuery = vendorsQuery.or([
      { fullName: searchRegex },
      { email: searchRegex },
    ]);
  }

  // فلتر بالقسم (categoryId)
  if (categoryId) {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return next(new Error("❌ معرف القسم غير صحيح", { cause: 400 }));
    }
    vendorsQuery = vendorsQuery.where("categories").in([categoryId]);
  }

  const vendors = await vendorsQuery
    .select("fullName email phone companyName status createdAt")
    .populate({
      path: "categories",
      match: { isActive: true },
      select: "name slug",
    })
    .lean();

  let formattedVendors = vendors.map((vendor) => {
    const stat = statsMap[vendor._id.toString()] || {
      totalSales: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      monthlySales: 0,
      monthlyOrders: 0,
    };
    const prod = productMap[vendor._id.toString()] || {
      productCount: 0,
      avgRating: 0,
    };

    const commissionDue = stat.totalSales * 0.05;

    return {
      _id: vendor._id,
      fullName: vendor.fullName,
      email: vendor.email,
      phone: vendor.phone || null,
      companyName: vendor.companyName || null,
      status: vendor.status,
      createdAt: vendor.createdAt,
      categories: (vendor.categories || []).map((cat) => ({
        _id: cat._id,
        name: cat.name[lang] || cat.name.en,
        slug: cat.slug,
      })),
      stats: {
        totalSales: stat.totalSales,
        totalOrders: stat.totalOrders,
        completedOrders: stat.completedOrders,
        cancelledOrders: stat.cancelledOrders,
        completionRate:
          stat.totalOrders > 0
            ? ((stat.completedOrders / stat.totalOrders) * 100).toFixed(1) + "%"
            : "0%",
        cancellationRate:
          stat.totalOrders > 0
            ? ((stat.cancelledOrders / stat.totalOrders) * 100).toFixed(1) + "%"
            : "0%",
        productCount: prod.productCount,
        avgRating: prod.avgRating,
        commissionDue: commissionDue.toFixed(0),
        monthlySales: stat.monthlySales,
        monthlyOrders: stat.monthlyOrders,
        avgOrderValue:
          stat.monthlyOrders > 0
            ? (stat.monthlySales / stat.monthlyOrders).toFixed(0)
            : 0,
      },
    };
  });

  // ترتيب التجار
  let sortField = "totalSales";
  if (sortBy === "rating") sortField = "avgRating";
  if (sortBy === "orders") sortField = "totalOrders";

  formattedVendors.sort((a, b) => b.stats[sortField] - a.stats[sortField]);

  const totalVendorsCount = formattedVendors.length;
  const paginatedVendors = formattedVendors.slice(skip, skip + limitNum);

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalVendorsCount / limitNum),
    totalItems: totalVendorsCount,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalVendorsCount / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب التجار مع الإحصائيات بنجاح ✅",
    overallStats,
    count: paginatedVendors.length,
    pagination,
    data: paginatedVendors,
  });
});

import mongoose from "mongoose";
import { CategoryRequestModel } from "../../../DB/models/categoryRequestSchemaaa.js";
import { NotificationModelUser } from "../../../DB/models/notificationSchemaUser.js";

export const getVendorDetailedStats = asyncHandelr(async (req, res, next) => {
  const { vendorId } = req.params;

  // تحقق من صحة vendorId
  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new Error("❌ معرف التاجر غير صحيح", { cause: 400 }));
  }

  const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

  const {
    page = 1,
    limit = 10,
    period = "all", // all or monthly
    showProducts = "false", // true لجلب المنتجات
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // فلتر الطلبات المدفوعة للتاجر
  const orderFilter = { vendorId: vendorObjectId, paymentStatus: "paid" };

  // إحصائيات الطلبات
  const orderStatsAggregation = await OrderModelUser.aggregate([
    { $match: orderFilter },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$totalAmount" },
        totalOrders: { $sum: 1 },
        completedOrders: {
          $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
        },
        monthlySales: {
          $sum: {
            $cond: [{ $gte: ["$createdAt", startOfMonth] }, "$totalAmount", 0],
          },
        },
        monthlyOrders: {
          $sum: { $cond: [{ $gte: ["$createdAt", startOfMonth] }, 1, 0] },
        },
        lastMonthSales: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gte: ["$createdAt", startOfLastMonth] },
                  { $lte: ["$createdAt", endOfLastMonth] },
                ],
              },
              "$totalAmount",
              0,
            ],
          },
        },
      },
    },
  ]);

  const stats = orderStatsAggregation[0] || {
    totalSales: 0,
    totalOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    monthlySales: 0,
    monthlyOrders: 0,
    lastMonthSales: 0,
  };

  // نسبة الزيادة من الشهر الماضي
  let growthPercentage = 0;
  if (stats.lastMonthSales > 0) {
    growthPercentage =
      ((stats.monthlySales - stats.lastMonthSales) / stats.lastMonthSales) *
      100;
  } else if (stats.monthlySales > 0) {
    growthPercentage = 100;
  }
  const growthText =
    growthPercentage >= 0
      ? `↑ ${growthPercentage.toFixed(1)}% من الشهر الماضي`
      : `↓ ${Math.abs(growthPercentage).toFixed(1)}% من الشهر الماضي`;

  // عمولة المنصة
  const commissionRate = 0.05;
  const salesForCommission =
    period === "monthly" ? stats.monthlySales : stats.totalSales;
  const commissionDue = salesForCommission * commissionRate;

  // عدد المنتجات النشطة
  const productCount = await ProductModellll.countDocuments({
    createdBy: vendorObjectId,
    isActive: true,
  });

  // متوسطات
  const displaySales =
    period === "monthly" ? stats.monthlySales : stats.totalSales;
  const displayOrders =
    period === "monthly" ? stats.monthlyOrders : stats.totalOrders;
  const avgOrderValue = displayOrders > 0 ? displaySales / displayOrders : 0;

  // المنتجات الأكثر مبيعًا
  const topProductsAggregation = await OrderModelUser.aggregate([
    { $match: orderFilter },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.productId",
        salesCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { salesCount: -1 } },
    { $limit: 3 },
    {
      $lookup: {
        from: ProductModellll.collection.name,
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        name: {
          $ifNull: [
            "$product.name.ar",
            { $ifNull: ["$product.name.en", "منتج غير معروف"] },
          ],
        },
        sales: "$salesCount",
      },
    },
  ]);

  const topProducts = topProductsAggregation.map((p, index) => ({
    rank: index + 1,
    name: p.name,
    sales: p.sales,
  }));

  // جلب المنتجات لو مطلوب
  let vendorProducts = [];
  let productsPagination = null;

  if (showProducts === "true") {
    const totalProductsCount = await ProductModellll.countDocuments({
      createdBy: vendorObjectId,
      isActive: true,
    });

    vendorProducts = await ProductModellll.find({
      createdBy: vendorObjectId,
      isActive: true,
    })
      .select("name sku images mainPrice disCountPrice hasVariants stock")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    productsPagination = {
      currentPage: pageNum,
      totalPages: Math.ceil(totalProductsCount / limitNum),
      totalItems: totalProductsCount,
      itemsPerPage: limitNum,
      hasNext: pageNum < Math.ceil(totalProductsCount / limitNum),
      hasPrev: pageNum > 1,
    };
  }

  // ✅ جلب بيانات التاجر (الإضافة الجديدة)
  const vendor = await Usermodel.findById(vendorObjectId)
    .select("fullName email phone companyName status createdAt")
    .lean();

  const summary = {
    totalSales: `${displaySales.toLocaleString()} ر.س`,
    salesGrowth: growthText,
    commissionDue: `${commissionDue.toFixed(0)} ر.س`,
    commissionRate: "5% من المبيعات",
    totalOrders: displayOrders,
    completedOrders: stats.completedOrders,
    totalProducts: productCount,
    monthlyAvg: {
      sales: `${displaySales.toLocaleString()} ر.س`,
      orders: `${displayOrders} طلب`,
      avgOrderValue: `${avgOrderValue.toFixed(0)} ر.س`,
    },
    topProducts,
    performance: {
      completionRate:
        stats.totalOrders > 0
          ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) + "%"
          : "0%",
      cancellationRate:
        stats.totalOrders > 0
          ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) + "%"
          : "0%",
    },
  };

  res.status(200).json({
    success: true,
    message: "تم جلب تحليلات التاجر بنجاح ✅",
    data: {
      vendorId,
      vendor: vendor
        ? {
            fullName: vendor.fullName,
            email: vendor.email,
            phone: vendor.phone || null,
            companyName: vendor.companyName || null,
            status: vendor.status,
            joinedAt: vendor.createdAt,
          }
        : null,
      summary,
      products:
        showProducts === "true"
          ? {
              count: vendorProducts.length,
              pagination: productsPagination,
              list: vendorProducts,
            }
          : null,
    },
  });
});

export const getVendorSalesChart = asyncHandelr(async (req, res, next) => {
  const { vendorId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(vendorId)) {
    return next(new Error("❌ معرف التاجر غير صحيح", { cause: 400 }));
  }

  const vendorObjectId = new mongoose.Types.ObjectId(vendorId);

  const { type = "daily" } = req.query; // daily or monthly

  let groupFormat;
  let dateTrunc;
  let startDate;

  if (type === "monthly") {
    // آخر 12 شهر
    groupFormat = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
    };
    dateTrunc = { $dateTrunc: { date: "$createdAt", unit: "month" } };
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
  } else {
    // آخر 30 يوم
    groupFormat = {
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" },
      day: { $dayOfMonth: "$createdAt" },
    };
    dateTrunc = { $dateTrunc: { date: "$createdAt", unit: "day" } };
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
  }

  const salesData = await OrderModelUser.aggregate([
    {
      $match: {
        vendorId: vendorObjectId,
        paymentStatus: "paid",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: groupFormat,
        date: { $first: dateTrunc },
        sales: { $sum: "$totalAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { date: 1 } },
  ]);

  // إنشاء labels و data كاملة (مع 0 للأيام/الشهور الفاضية)
  let labels = [];
  let sales = [];
  let orders = [];

  let current = new Date(startDate);
  const end = new Date();

  if (type === "monthly") {
    current = new Date(current.getFullYear(), current.getMonth(), 1);
  } else {
    current = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate(),
    );
  }

  const dataMap = {};
  salesData.forEach((d) => {
    dataMap[d.date.toISOString().slice(0, type === "monthly" ? 7 : 10)] = {
      sales: d.sales,
      orders: d.orders,
    };
  });

  while (current <= end) {
    let key;
    if (type === "monthly") {
      key = current.toISOString().slice(0, 7); // YYYY-MM
      labels.push(
        current.toLocaleDateString("ar-SA", { year: "numeric", month: "long" }),
      );
    } else {
      key = current.toISOString().slice(0, 10); // YYYY-MM-DD
      labels.push(
        current.toLocaleDateString("ar-SA", { day: "numeric", month: "short" }),
      );
    }

    const dayData = dataMap[key] || { sales: 0, orders: 0 };
    sales.push(dayData.sales);
    orders.push(dayData.orders);

    if (type === "monthly") {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
  }

  res.status(200).json({
    success: true,
    message: "تم جلب بيانات الرسم البياني بنجاح ",
    data: {
      type,
      labels,
      datasets: [
        {
          label: "المبيعات (ر.س)",
          data: sales,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          tension: 0.4,
        },
        {
          label: "عدد الطلبات",
          data: orders,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          tension: 0.4,
          yAxisID: "orders",
        },
      ],
    },
  });
});

export const createCategoryRequest = asyncHandelr(async (req, res, next) => {
  const {
    categoryType, // "main" or "sub"
    parentCategoryId, // مطلوب لو sub
    nameAr,
    nameEn,
    descriptionAr,
    descriptionEn,
  } = req.body;

  // ✅ التحقق من تسجيل الدخول
  if (!req.user) {
    return next(
      new Error("❌ يجب تسجيل الدخول لتقديم طلب قسم جديد", { cause: 401 }),
    );
  }

  const userId = req.user._id;

  // ✅ التحقق من الحقول الأساسية
  if (!categoryType || !["main", "sub"].includes(categoryType)) {
    return next(
      new Error("❌ نوع القسم مطلوب ويجب أن يكون main أو sub", { cause: 400 }),
    );
  }

  if (!nameAr || !nameEn) {
    return next(
      new Error("❌ اسم القسم مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  if (!descriptionAr || !descriptionEn) {
    return next(
      new Error("❌ وصف القسم مطلوب بالعربي والإنجليزي", { cause: 400 }),
    );
  }

  // ✅ لو فرعي → تحقق من وجود القسم الأب
  if (categoryType === "sub") {
    if (!parentCategoryId) {
      return next(
        new Error("❌ يجب تحديد القسم الرئيسي للقسم الفرعي", { cause: 400 }),
      );
    }

    const parent = await CategoryModellll.findOne({
      _id: parentCategoryId,
      isActive: true,
    });

    if (!parent) {
      return next(
        new Error("❌ القسم الرئيسي غير موجود أو غير مفعل", { cause: 404 }),
      );
    }
  }

  // ✅ إنشاء طلب القسم
  const request = await CategoryRequestModel.create({
    userId,
    categoryType,
    parentCategoryId: categoryType === "sub" ? parentCategoryId : null,
    name: {
      ar: nameAr.trim(),
      en: nameEn.trim(),
    },
    description: {
      ar: descriptionAr.trim(),
      en: descriptionEn.trim(),
    },
  });

  // ✅ إنشاء إشعار للأدمن
  const admins = await Usermodel.find({
    accountType: { $in: ["Admin", "Owner"] },
  });

  for (const admin of admins) {
    await NotificationModelUser.create({
      recipientId: admin._id,
      type: "category_request",
      title: {
        ar: "طلب قسم جديد",
        en: "New Category Request",
      },
      message: {
        ar: `${req.user.fullName} طلب إضافة قسم جديد: "${nameAr}"`,
        en: `${req.user.fullName} requested a new category: "${nameEn}"`,
      },
      data: { requestId: request._id },
    });
  }

  res.status(201).json({
    success: true,
    message: "تم إرسال طلب إضافة القسم بنجاح، سيتم مراجعته قريبًا ✅",
    data: {
      requestId: request._id,
      status: request.status,
      createdAt: request.createdAt,
    },
  });
});

export const getCategoryRequests = asyncHandelr(async (req, res, next) => {
  // ✅ صلاحية أدمن فقط
  // if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بعرض طلبات الأقسام", { cause: 403 }));
  // }

  const {
    page = 1,
    limit = 10,
    status, // pending, approved, rejected
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));
  const skip = (pageNum - 1) * limitNum;

  let filter = {};

  if (status) {
    const valid = ["pending", "approved", "rejected"];
    if (!valid.includes(status)) {
      return next(new Error("❌ حالة غير صحيحة", { cause: 400 }));
    }
    filter.status = status;
  }

  const totalRequests = await CategoryRequestModel.countDocuments(filter);

  const requests = await CategoryRequestModel.find(filter)
    .populate("userId", "fullName email phone")
    .populate("parentCategoryId", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const formattedRequests = requests.map((req) => ({
    _id: req._id,
    user: {
      _id: req.userId?._id,
      fullName: req.userId?.fullName,
      email: req.userId?.email,
      phone: req.userId?.phone,
    },
    categoryType: req.categoryType,
    parentCategory: req.parentCategoryId
      ? {
          _id: req.parentCategoryId._id,
          name: req.parentCategoryId.name,
        }
      : null,
    name: req.name,
    description: req.description,
    status: req.status,
    rejectionReason: req.rejectionReason || null,
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  }));

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalRequests / limitNum),
    totalItems: totalRequests,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalRequests / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب طلبات الأقسام بنجاح ",
    count: formattedRequests.length,
    pagination,
    data: formattedRequests,
  });
});

export const updateCategoryRequest = asyncHandelr(async (req, res, next) => {
  const { requestId } = req.params;
  const { status, rejectionReason } = req.body; // status: "approved" or "rejected"

  // if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بتحديث طلبات الأقسام", { cause: 403 }));
  // }

  if (!["approved", "rejected"].includes(status)) {
    return next(
      new Error("❌ الحالة يجب أن تكون approved أو rejected", { cause: 400 }),
    );
  }

  if (status === "rejected" && !rejectionReason) {
    return next(new Error("❌ سبب الرفض مطلوب عند الرفض", { cause: 400 }));
  }

  const request =
    await CategoryRequestModel.findById(requestId).populate("userId");

  if (!request) {
    return next(new Error("❌ طلب القسم غير موجود", { cause: 404 }));
  }

  if (request.status !== "pending") {
    return next(
      new Error("❌ لا يمكن تحديث طلب تم معالجته بالفعل", { cause: 400 }),
    );
  }

  request.status = status;
  if (status === "rejected") {
    request.rejectionReason = rejectionReason.trim();
  }

  await request.save();

  // إشعار للعميل
  await NotificationModelUser.create({
    recipientId: request.userId._id,
    type: "category_request",
    title: {
      ar:
        status === "approved"
          ? "تمت الموافقة على طلب القسم"
          : "تم رفض طلب القسم",
      en:
        status === "approved"
          ? "Category Request Approved"
          : "Category Request Rejected",
    },
    message: {
      ar:
        status === "approved"
          ? `تمت الموافقة على طلبك لإضافة قسم "${request.name.ar}"`
          : `تم رفض طلبك لإضافة قسم "${request.name.ar}". السبب: ${rejectionReason}`,
      en:
        status === "approved"
          ? `Your request to add category "${request.name.en}" has been approved`
          : `Your request to add category "${request.name.en}" has been rejected. Reason: ${rejectionReason}`,
    },
    data: { requestId: request._id },
  });

  res.status(200).json({
    success: true,
    message:
      status === "approved"
        ? "تمت الموافقة على الطلب بنجاح ✅"
        : "تم رفض الطلب بنجاح ✅",
    data: {
      requestId: request._id,
      status: request.status,
      rejectionReason: request.rejectionReason,
    },
  });
});

export const getAllNotificationsAdmin = asyncHandelr(async (req, res, next) => {
  // // ✅ صلاحية أدمن فقط
  // if (!req.user || !["Admin", "Owner"].includes(req.user.accountType)) {
  //     return next(new Error("❌ غير مصرح لك بعرض جميع الإشعارات", { cause: 403 }));
  // }

  const {
    page = 1,
    limit = 20,
    unreadOnly = "false",
    type, // فلتر بنوع الإشعار مثل "category_request"
    userId, // فلتر بيوزر معين (recipientId)
  } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  // فلتر عام
  let filter = { isDeleted: false };

  if (unreadOnly === "true") {
    filter.isRead = false;
  }

  if (type) {
    filter.type = type;
  }

  if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return next(new Error("❌ معرف المستخدم غير صحيح", { cause: 400 }));
    }
    filter.recipientId = userId;
  }

  const totalNotifications = await NotificationModelUser.countDocuments(filter);

  const notifications = await NotificationModelUser.find(filter)
    .populate("recipientId", "fullName email accountType") // عشان نعرف مين اللي استقبل
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const unreadCount = await NotificationModelUser.countDocuments({
    ...filter,
    isRead: false,
  });

  const formattedNotifications = notifications.map((n) => ({
    _id: n._id,
    recipient: n.recipientId
      ? {
          _id: n.recipientId._id,
          fullName: n.recipientId.fullName,
          email: n.recipientId.email,
          accountType: n.recipientId.accountType,
        }
      : null,
    title: n.title,
    message: n.message,
    type: n.type,
    data: n.data,
    isRead: n.isRead,
    createdAt: n.createdAt,
  }));

  const pagination = {
    currentPage: pageNum,
    totalPages: Math.ceil(totalNotifications / limitNum),
    totalItems: totalNotifications,
    itemsPerPage: limitNum,
    hasNext: pageNum < Math.ceil(totalNotifications / limitNum),
    hasPrev: pageNum > 1,
  };

  res.status(200).json({
    success: true,
    message: "تم جلب جميع الإشعارات بنجاح ",
    unreadCount,
    count: formattedNotifications.length,
    pagination,
    data: formattedNotifications,
  });
});

export const getMyNotifications = asyncHandelr(async (req, res, next) => {
  if (!req.user) {
    return next(new Error("❌ يجب تسجيل الدخول", { cause: 401 }));
  }

  const { page = 1, limit = 20, unreadOnly = false } = req.query;

  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  let filter = { recipientId: req.user._id, isDeleted: false };

  if (unreadOnly === "true") {
    filter.isRead = false;
  }

  const totalNotifications = await NotificationModelUser.countDocuments(filter);

  const notifications = await NotificationModelUser.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .lean();

  const unreadCount = await NotificationModelUser.countDocuments({
    recipientId: req.user._id,
    isRead: false,
    isDeleted: false,
  });

  res.status(200).json({
    success: true,
    message: "تم جلب الإشعارات بنجاح ✅",
    unreadCount,
    count: notifications.length,
    data: notifications.map((n) => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      data: n.data,
      isRead: n.isRead,
      createdAt: n.createdAt,
    })),
  });
});

export const MarkAllNotificationsAsRead = asyncHandelr(
  async (req, res, next) => {
    // ✅ التحقق من تسجيل الدخول
    if (!req.user) {
      return next(new Error("❌ يجب تسجيل الدخول", { cause: 401 }));
    }

    const userId = req.user._id;

    // تحديث كل الإشعارات غير المقروءة للمستخدم
    const result = await NotificationModelUser.updateMany(
      {
        recipientId: userId,
        isRead: false,
        isDeleted: false,
      },
      {
        $set: { isRead: true },
      },
    );

    const updatedCount = result.modifiedCount || 0;

    res.status(200).json({
      success: true,
      message:
        updatedCount > 0
          ? `تم تحديد ${updatedCount} إشعار(ات) كمقروءة بنجاح ✅`
          : "لا توجد إشعارات غير مقروءة",
      data: {
        updatedCount,
        unreadCountNow: 0, // بعد التحديث
      },
    });
  },
);
