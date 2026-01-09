import Usermodel, { providerTypes, roletypes } from "../../../DB/models/User.model.js";
import * as dbservice from "../../../DB/dbservice.js"
import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { comparehash, generatehash } from "../../../utlis/security/hash.security.js";
import { successresponse } from "../../../utlis/response/success.response.js";
import {  decodedToken,  generatetoken,  tokenTypes } from "../../../utlis/security/Token.security.js";
import { Emailevent } from "../../../utlis/events/email.emit.js";
import { OAuth2Client } from "google-auth-library";
import axios from "axios";
import OtpModel from "../../../DB/models/otp.model.js";
import { nanoid, customAlphabet } from "nanoid";
import { vervicaionemailtemplet } from "../../../utlis/temblete/vervication.email.js";
import { sendemail } from "../../../utlis/email/sendemail.js";
import { RestaurantModel } from "../../../DB/models/RestaurantSchema.model.js";
// import { sendOTP } from "./regestration.service.js";
import AppSettingsSchema from "../../../DB/models/AppSettingsSchema.js";
import { sendOTP } from "./regestration.service.js";
import { CategoryModellll } from "../../../DB/models/categorySchemaaa.js";
const AUTHENTICA_OTP_URL = "https://api.authentica.sa/api/v1/send-otp";
import {convertProductPrices} from "./changeCurrencyHelper.service.js"
import cloud from "../../../utlis/multer/cloudinary.js";
import fs from 'fs';
// export const login = asyncHandelr(async (req, res, next) => {
//     const { identifier, password } = req.body; // identifier يمكن أن يكون إيميل أو رقم هاتف
//     console.log(identifier, password);

//     const checkUser = await Usermodel.findOne({
//         $or: [{ email: identifier }, { phone: identifier }]
//     });

//     if (!checkUser) {
//         return next(new Error("User not found", { cause: 404 }));
//     }

//     if (checkUser?.provider === providerTypes.google) {
//         return next(new Error("Invalid account", { cause: 404 }));
//     }

//     if (!checkUser.isConfirmed) {
//         return next(new Error("Please confirm your email tmm ", { cause: 404 }));
//     }

//     if (!comparehash({ planText: password, valuehash: checkUser.password })) {
//         return next(new Error("Password is incorrect", { cause: 404 }));
//     }

//     const access_Token = generatetoken({
//         payload: { id: checkUser._id },
//         // signature: checkUser.role === roletypes.Admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
//     });

//     const refreshToken = generatetoken({
//         payload: { id: checkUser._id },
//         // signature: checkUser.role === roletypes.Admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
//         expiresIn: "365d"
//     });

//     return successresponse(res, "Done", 200, { access_Token, refreshToken, checkUser });
// });








// export const login = asyncHandelr(async (req, res, next) => {
//     const { identifier, password } = req.body; // identifier ممكن يكون إيميل أو رقم هاتف
//     console.log(identifier, password);

//     const checkUser = await Usermodel.findOne({
//         $or: [{ email: identifier }, { phone: identifier }]
//     });

//     if (!checkUser) {
//         return next(new Error("User not found", { cause: 404 }));
//     }

//     if (checkUser?.provider === providerTypes.google) {
//         return next(new Error("Invalid account", { cause: 404 }));
//     }

//     // ✅ تحقق من حالة التأكيد
//     if (!checkUser.isConfirmed) {
//         try {
//             if (checkUser.phone) {
//                 // ✅ إرسال OTP للهاتف
//                 await sendOTP(checkUser.phone);
//                 console.log(`📩 OTP تم إرساله إلى الهاتف: ${checkUser.phone}`);
//             } else if (checkUser.email) {
//                 // ✅ إنشاء OTP جديد للبريد
//                 const otp = customAlphabet("0123456789", 6)();
//                 const html = vervicaionemailtemplet({ code: otp });

//                 const emailOTP = await generatehash({ planText: `${otp}` });
//                 const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

//                 await Usermodel.updateOne(
//                     { _id: checkUser._id },
//                     { emailOTP, otpExpiresAt, attemptCount: 0 }
//                 );

//                 await sendemail({
//                     to: checkUser.email,
//                     subject: "Confirm Email",
//                     text: "رمز التحقق الخاص بك",
//                     html,
//                 });

//                 console.log(`📩 OTP تم إرساله إلى البريد: ${checkUser.email}`);
//             }

//             return successresponse(
//                 res,
//                 "الحساب غير مفعل، تم إرسال رمز التحقق من جديد",
//                 200,
//                 { status: "notverified" }
//             );
//         } catch (error) {
//             console.error("❌ فشل في إرسال OTP أثناء تسجيل الدخول:", error.message);
//             return next(new Error("فشل في إرسال رمز التحقق", { cause: 500 }));
//         }
//     }

//     // ✅ التحقق من كلمة المرور
//     if (!comparehash({ planText: password, valuehash: checkUser.password })) {
//         return next(new Error("Password is incorrect", { cause: 404 }));
//     }

//     // ✅ إنشاء التوكنات
//     const access_Token = generatetoken({
//         payload: { id: checkUser._id },
//     });

//     const refreshToken = generatetoken({
//         payload: { id: checkUser._id },
//         expiresIn: "365d"
//     });

//     return successresponse(res, "Done", 200, { access_Token, refreshToken, checkUser });
// });





// export const login = asyncHandelr(async (req, res, next) => {
//     const { identifier, password } = req.body; // identifier ممكن يكون إيميل أو رقم هاتف
//     const { fedk, fedkdrivers } = req.query; // ✅ الحقلين الجدد من query
//     console.log(identifier, password);

//     // ✅ إعداد الفلتر الأساسي
//     let baseFilter = {
//         $or: [{ email: identifier }, { phone: identifier }]
//     };

//     // ✅ لو الحقل fedk موجود → نبحث عن User أو ServiceProvider (Host, Doctor)
//     if (fedk) {
//         baseFilter.$or = [
//             { email: identifier, accountType: "User" },
//             { phone: identifier, accountType: "User" },
//             { email: identifier, accountType: "ServiceProvider", serviceType: { $in: ["Host", "Doctor"] } },
//             { phone: identifier, accountType: "ServiceProvider", serviceType: { $in: ["Host", "Doctor"] } }
//         ];
//     }

//     // ✅ لو الحقل fedkdrivers موجود → نبحث عن ServiceProvider (Driver, Delivery)
//     if (fedkdrivers) {
//         baseFilter.$or = [
//             { email: identifier, accountType: "ServiceProvider", serviceType: { $in: ["Driver", "Delivery"] } },
//             { phone: identifier, accountType: "ServiceProvider", serviceType: { $in: ["Driver", "Delivery"] } }
//         ];
//     }

//     const checkUser = await Usermodel.findOne(baseFilter);

//     if (!checkUser) {
//         return next(new Error("User not found", { cause: 404 }));
//     }

//     if (checkUser?.provider === providerTypes.google) {
//         return next(new Error("Invalid account", { cause: 404 }));
//     }

//     // ✅ تحقق من حالة التأكيد
//     if (!checkUser.isConfirmed) {
//         try {
//             if (checkUser.phone) {
//                 // ✅ إرسال OTP للهاتف
//                 await sendOTP(checkUser.phone);
//                 console.log(`📩 OTP تم إرساله إلى الهاتف: ${checkUser.phone}`);
//             } else if (checkUser.email) {
//                 // ✅ إنشاء OTP جديد للبريد
//                 const otp = customAlphabet("0123456789", 6)();
//                 const html = vervicaionemailtemplet({ code: otp });

//                 const emailOTP = await generatehash({ planText: `${otp}` });
//                 const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

//                 await Usermodel.updateOne(
//                     { _id: checkUser._id },
//                     { emailOTP, otpExpiresAt, attemptCount: 0 }
//                 );

//                 await sendemail({
//                     to: checkUser.email,
//                     subject: "Confirm Email",
//                     text: "رمز التحقق الخاص بك",
//                     html,
//                 });

//                 console.log(`📩 OTP تم إرساله إلى البريد: ${checkUser.email}`);
//             }

//             return successresponse(
//                 res,
//                 "الحساب غير مفعل، تم إرسال رمز التحقق من جديد",
//                 200,
//                 { status: "notverified" }
//             );
//         } catch (error) {
//             console.error("❌ فشل في إرسال OTP أثناء تسجيل الدخول:", error.message);
//             return next(new Error("فشل في إرسال رمز التحقق", { cause: 500 }));
//         }
//     }

//     // ✅ التحقق من كلمة المرور
//     if (!comparehash({ planText: password, valuehash: checkUser.password })) {
//         return next(new Error("Password is incorrect", { cause: 404 }));
//     }

//     // ✅ إنشاء التوكنات
//     const access_Token = generatetoken({
//         payload: { id: checkUser._id },
//     });

//     const refreshToken = generatetoken({
//         payload: { id: checkUser._id },
//         expiresIn: "365d"
//     });

//     return successresponse(res, "Done", 200, { access_Token, refreshToken, checkUser });
// });






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
    if (checkUser.accountType === "staff" || checkUser.accountType === "manager") {
        if (!comparehash({ planText: password, valuehash: checkUser.password })) {
            return next(new Error("Password is incorrect", { cause: 404 }));
        }

        const access_Token = generatetoken({
            payload: { id: checkUser._id },
        });

        const refreshToken = generatetoken({
            payload: { id: checkUser._id },
            expiresIn: "365d"
        });

        return successresponse(res, "✅ Staff or Manager logged in successfully", 200, {
            access_Token,
            refreshToken,
            checkUser
        });
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
                { status: "notverified" }
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
        expiresIn: "365d"
    });

    return successresponse(res, "Done", 200, { access_Token, refreshToken, checkUser });
});









export const loginAdmin = asyncHandelr(async (req, res, next) => {
    const { identifier, password } = req.body; // identifier يمكن أن يكون إيميل أو رقم هاتف
    console.log(identifier, password);

    const checkUser = await Usermodel.findOne({
        $or: [{ email: identifier }, { phone: identifier }]
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
        expiresIn: "365d"
    });

    return successresponse(res, "Done", 200, { access_Token, refreshToken, checkUser });
});


















// export const loginwithGmail = asyncHandelr(async (req, res, next) => {
//     const { idToken } = req.body;
//     const client = new OAuth2Client();

//     async function verify() {
//         const ticket = await client.verifyIdToken({
//             idToken,
//             audience: process.env.CIENT_ID,
//         });
//         return ticket.getPayload();
//     }

//     const payload = await verify();
//     console.log("Google Payload Data:", payload);

//     const { name, email, email_verified, picture } = payload;

//     if (!email) {
//         return next(new Error("Email is missing in Google response", { cause: 400 }));
//     }
//     if (!email_verified) {
//         return next(new Error("Email not verified", { cause: 404 }));
//     }

//     let user = await dbservice.findOne({
//         model: Usermodel,
//         filter: { email },
//     });

//     if (user?.provider === providerTypes.system) {
//         return next(new Error("Invalid account", { cause: 404 }));
//     }

//     if (!user) {
//         user = await dbservice.create({
//             model: Usermodel,
//             data: {
//                 email,
//                 username: name,
//                 profilePic: { secure_url: picture },
//                 isConfirmed: email_verified,
//                 provider: providerTypes.google,
//             },
//         });
//     }

//     const access_Token = generatetoken({
//         payload: { id: user._id },
//         // signature: user?.role === roletypes.Admin ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
//     });

//     const refreshToken = generatetoken({
//         payload: { id: user._id },
//         // signature: user?.role === roletypes.Admin ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
//         expiresIn: "365d"
//     });
//     return successresponse(res, "Login successful", 200, { access_Token, refreshToken })

// });

export const refreshToken = asyncHandelr(async (req, res, next) => {

    const user = await decodedToken({ authorization: req.headers.authorization, tokenType: tokenTypes.refresh })

    const accessToken = generatetoken({
        payload: { id: user._id },
        // signature: user.role === 'Admin' ? process.env.SYSTEM_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN,
    });

    // 7. إنشاء refresh token جديد
    const newRefreshToken = generatetoken({
        payload: { id: user._id },
        // signature: user.role === 'Admin' ? process.env.SYSTEM_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
        expiresIn: "365d"// سنة واحدة
    });

    // 8. إرجاع الرد الناجح
    return successresponse(res, "Token refreshed successfully", 200, { accessToken, refreshToken: newRefreshToken });
});


 
export const forgetpassword = asyncHandelr(async (req, res, next) => {
    const { email } = req.body;
    console.log(email);

    const checkUser = await Usermodel.findOne({ email });
    if (!checkUser) {
        return next(new Error("User not found", { cause: 404 }));
    }

    Emailevent.emit("forgetpassword", { email })

    return successresponse(res);
});






export const resetpassword = asyncHandelr(async (req, res, next) => {
    const { email, password, code } = req.body;
    console.log(email, password, code);

    const checkUser = await Usermodel.findOne({ email });
    if (!checkUser) {
        return next(new Error("User not found", { cause: 404 }));
    }

    if (!comparehash({ planText: code, valuehash: checkUser.forgetpasswordOTP })) {

        return next(new Error("code not match", { cause: 404 }));
    }

    const hashpassword = generatehash({ planText: password })
    await Usermodel.updateOne({ email }, {

        password: hashpassword,
        isConfirmed: true,
        changeCredentialTime: Date.now(),
        $unset: { forgetpasswordOTP: 0, otpExpiresAt: 0, attemptCount: 0 },

    })

    return successresponse(res);
});


export const resendOTP = asyncHandelr(async (req, res, next) => {
    const { email } = req.body;
    console.log(email);

    const checkUser = await Usermodel.findOne({ email });
    if (!checkUser) {
        return next(new Error("User not found", { cause: 404 }));
    }

    
    if (checkUser.otpExpiresAt && checkUser.otpExpiresAt > Date.now()) {
        return next(new Error("Please wait before requesting a new code", { cause: 429 }));
    }


    const otp = customAlphabet("0123456789", 6)();
    const forgetpasswordOTP = generatehash({ planText: otp });

  
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

 
    await Usermodel.updateOne(
        { email },
        {
            forgetpasswordOTP,
            otpExpiresAt,
            attemptCount: 0
        }
    );


    const html = vervicaionemailtemplet({ code: otp });
    await sendemail({ to: email, subject: "Resend OTP", html });

    console.log("OTP resent successfully!");
    return successresponse(res, "A new OTP has been sent to your email.");
});

// $2y$10$ZHEfQKrayDl6V3JwOwnyreovYvhG.zTMW6mIedMEOjjoTr2R367Zy

// const AUTHENTICA_API_KEY = process.env.AUTHENTICA_API_KEY || "$2y$10$q3BAdOAyWapl3B9YtEVXK.DHmJf/yaOqF4U.MpbBmR8bwjSxm4A6W";
// const AUTHENTICA_VERIFY_URL = "https://api.authentica.sa/api/v1/verify-otp";

// export const verifyOTP = async (req, res, next) => {
//     const { phone, otp } = req.body;

//     if (!phone || !otp) {
//         return res.status(400).json({ success: false, error: "❌ يجب إدخال رقم الهاتف و OTP" });
//     }

//     try {
//         const user = await dbservice.findOne({
//             model: Usermodel,
//             filter: { mobileNumber: phone }
//         });

//         if (!user) {
//             return next(new Error("❌ رقم الهاتف غير مسجل", { cause: 404 }));
//         }

//         console.log("📨 جاري التحقق من OTP بالبيانات:", { phone, otp, session_id: undefined });

//         const response = await axios.post(
//             AUTHENTICA_VERIFY_URL,
//             {
//                 phone,
//                 otp,
//                 session_id: undefined  // مؤقتًا نرسله undefined حتى نعرف من الرد هل هو مطلوب
//             },
//             {
//                 headers: {
//                     "X-Authorization": AUTHENTICA_API_KEY,
//                     "Content-Type": "application/json",
//                     "Accept": "application/json"
//                 },
//             }
//         );

//         console.log("📩 استجابة API من AUTHENTICA:", JSON.stringify(response.data, null, 2));

//         if (response.data.status === true && response.data.message === "OTP verified successfully") {
//             await dbservice.updateOne({
//                 model: Usermodel,
//                 filter: { mobileNumber: phone },
//                 data: { isConfirmed: true }
//             });

//             const access_Token = generatetoken({ payload: { id: user._id } });
//             const refreshToken = generatetoken({ payload: { id: user._id }, expiresIn: "365d" });

//             return res.json({
//                 success: true,
//                 message: "✅ OTP صحيح، تم التحقق بنجاح!",
//                 access_Token,
//                 refreshToken
//             });
//         } else {
//             return res.status(400).json({
//                 success: false,
//                 message: "❌ OTP غير صحيح",
//                 details: response.data
//             });
//         }
//     } catch (error) {
//         console.error("❌ فشل التحقق من OTP:", error.response?.data || error.message);

//         return res.status(500).json({
//             success: false,
//             error: "❌ فشل التحقق من OTP",
//             details: error.response?.data || error.message
//         });
//     }
// };



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
            }
        );

        console.log("✅ OTP Verified:", response.data);
        return response.data;
    } catch (error) {
        console.error(
            "❌ OTP Verification Failed:",
            error.response?.data || error.message
        );
        throw error;
    }
}



// export const confirEachOtp = asyncHandelr(async (req, res, next) => {
//     const { code, email, phone } = req.body;

//     if (!code || (!email && !phone)) {
//         return next(new Error("يرجى إدخال الكود ورقم الهاتف أو البريد الإلكتروني", { cause: 400 }));
//     }

//     // ✅ تحقق عن طريق الهاتف باستخدام AUTHENTICA
//     if (phone) {
//         const user = await dbservice.findOne({
//             model: Usermodel,
//             isConfirmed: false,
//             filter: { phone }
//         });

//         if (!user) {
//             return next(new Error("رقم الهاتف غير مسجل", { cause: 404 }));
//         }

//         try {
//             const response = await axios.post(
//                 "https://api.authentica.sa/api/v1/verify-otp",
//                 {
//                     phone,
//                     otp: code,
//                     session_id: undefined
//                 },
//                 {
//                     headers: {
//                         "X-Authorization": process.env.AUTHENTICA_API_KEY,
//                         "Content-Type": "application/json",
//                         "Accept": "application/json"
//                     }
//                 }
//             );

//             console.log("📩 AUTHENTICA response:", response.data);

//             if (response.data.status === true && response.data.message === "OTP verified successfully") {
//                 await dbservice.updateOne({
//                     model: Usermodel,
//                     filter: { phone },
//                     data: { isConfirmed: true }
//                 });

//                 const access_Token = generatetoken({ payload: { id: user._id } });
//                 const refreshToken = generatetoken({ payload: { id: user._id }, expiresIn: "365d" });

//                 return successresponse(res, "✅ تم التحقق من رقم الهاتف بنجاح", 200, {
//                     access_Token,
//                     refreshToken,
//                     user
//                 });
//             } else {
//                 return next(new Error("❌ كود التحقق غير صحيح", { cause: 400 }));
//             }

//         } catch (error) {
//             console.error("❌ AUTHENTICA Error:", error.response?.data || error.message);
//             return next(new Error("❌ فشل التحقق من OTP عبر الهاتف", { cause: 500 }));
//         }
//     }

//     // ✅ تحقق عن طريق البريد الإلكتروني (محلي)
//     if (email) {
//         const user = await dbservice.findOne({ model: Usermodel, isConfirmed: false, filter: { email } });

//         if (!user) return next(new Error("البريد الإلكتروني غير مسجل", { cause: 404 }));

//         if (user.isConfirmed) return next(new Error("البريد الإلكتروني مؤكد بالفعل", { cause: 400 }));

//         if (Date.now() > new Date(user.otpExpiresAt).getTime()) {
//             return next(new Error("انتهت صلاحية الكود", { cause: 400 }));
//         }

//         const isValidOTP = comparehash({ planText: `${code}`, valuehash: user.emailOTP });
//         if (!isValidOTP) {
//             const attempts = (user.attemptCount || 0) + 1;

//             if (attempts >= 5) {
//                 await Usermodel.updateOne({ email }, {
//                     blockUntil: new Date(Date.now() + 2 * 60 * 1000),
//                     attemptCount: 0
//                 });
//                 return next(new Error("تم حظرك مؤقتًا بعد محاولات خاطئة كثيرة", { cause: 429 }));
//             }

//             await Usermodel.updateOne({ email }, { attemptCount: attempts });
//             return next(new Error("كود التحقق غير صحيح", { cause: 400 }));
//         }

//         await Usermodel.updateOne({ email }, {
//             isConfirmed: true,
//             $unset: { emailOTP: 0, otpExpiresAt: 0, attemptCount: 0, blockUntil: 0 }
//         });

//         const access_Token = generatetoken({ payload: { id: user._id } });
//         const refreshToken = generatetoken({ payload: { id: user._id }, expiresIn: "365d" });

//         return successresponse(res, "✅ تم تأكيد البريد الإلكتروني بنجاح", 200, {
//             access_Token,
//             refreshToken,
//             user
//         });
//     }
// });


export const confirOtp = asyncHandelr(async (req, res, next) => {
    const { code, phone } = req.body;

    if (!code || !phone) {
        return next(new Error("يرجى إدخال الكود ورقم الهاتف", { cause: 400 }));
    }

    const baseFilter = { phone };

    // ✅ تحقق عن طريق الهاتف فقط
    const user = await dbservice.findOne({
        model: Usermodel,
        filter: baseFilter
    });

    if (!user) return next(new Error("رقم الهاتف غير مسجل", { cause: 404 }));

    if (user.isConfirmed) {
        return successresponse(res, "✅ رقم الهاتف تم تأكيده مسبقًا", 200, { user });
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
                    "Accept": "application/json",
                },
            }
        );

        console.log("📩 AUTHENTICA response:", response.data);

        if (response.data?.status === true || response.data?.message === "OTP verified successfully") {
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
        console.error("❌ AUTHENTICA Error:", error.response?.data || error.message);
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
                method: "whatsapp",  // أو "sms" حسب الحاجة
                number_of_digits: 6,
                otp_format: "numeric",
                is_fallback_on: 0
            },
            {
                headers: {
                    "X-Authorization": AUTHENTICA_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
            }
        );

        console.log("✅ OTP تم إرساله بنجاح:", response.data);

        return res.json({ success: true, message: "✅ OTP تم إرساله إلى رقم الهاتف بنجاح" });
    } catch (error) {
        console.error("❌ فشل في إرسال OTP:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "❌ فشل في إرسال OTP",
            details: error.response?.data || error.message
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
    const allowedRoles = ['Owner', 'Admin'];
    if (!allowedRoles.includes(checkUser.role)) {
        return next(new Error("❌ هذا الحساب غير مصرح له بإعادة تعيين كلمة المرور", { cause: 403 }));
    }

    // 🔹 إرسال OTP عبر Authentica
    try {
        const response = await axios.post(
            AUTHENTICA_OTP_URL,
            {
                phone: phone,
                method: "whatsapp",  // أو "sms" حسب الحاجة
                number_of_digits: 6,
                otp_format: "numeric",
                is_fallback_on: 0
            },
            {
                headers: {
                    "X-Authorization": AUTHENTICA_API_KEY,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
            }
        );

        console.log("✅ OTP تم إرساله بنجاح:", response.data);

        return res.json({ success: true, message: "✅ OTP تم إرساله إلى رقم الهاتف بنجاح" });
    } catch (error) {
        console.error("❌ فشل في إرسال OTP:", error.response?.data || error.message);
        return res.status(500).json({
            success: false,
            error: "❌ فشل في إرسال OTP",
            details: error.response?.data || error.message
        });
    }
});





export const resetPasswordphone= asyncHandelr(async (req, res, next) => {
    const { phone, password, otp } = req.body;

   
    if (!phone || !password || !otp) {
        return next(new Error("❌ جميع الحقول مطلوبة: رقم الهاتف، كلمة المرور، والـ OTP", { cause: 400 }));
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
                    "Accept": "application/json"
                },
            }
        );

        console.log("📩 استجابة API:", response.data);

       
        if (response.data.status === true && response.data.message === "OTP verified successfully") {
            const hashpassword = generatehash({ planText: password });

            await Usermodel.updateOne(
                { mobileNumber: phone },
                {
                    password: hashpassword,
                    isConfirmed: true,
                    changeCredentialTime: Date.now(),
                }
            );

            return successresponse(res, "✅ تم إعادة تعيين كلمة المرور بنجاح", 200);
        } else {
            return next(new Error("❌ OTP غير صحيح", { cause: 400 }));
        }
    } catch (error) {
        console.error("❌ فشل التحقق من OTP:", error.response?.data || error.message);
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
        const response = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        userInfo = response.data;
    } catch (error) {
        console.error("Failed to fetch user info from Google:", error?.response?.data || error.message);
        return next(new Error("Failed to verify access token with Google", { cause: 401 }));
    }

    const { email, name, picture, email_verified } = userInfo;

    if (!email) {
        return next(new Error("Email is missing in Google response", { cause: 400 }));
    }
    if (!email_verified) {
        return next(new Error("Email not verified", { cause: 403 }));
    }


    let user = await dbservice.findOne({
        model: Usermodel,
        filter: { email },
    });

    if (user?.provider === providerTypes.system) {
        return next(new Error("Invalid account. Please login using your email/password", { cause: 403 }));
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
        expiresIn: "365d"
    });

    return successresponse(res, "Done", 200, { access_Token, refreshToken, user });
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
    const checkUser = await Usermodel.findOne({ email }).select('+password');

    if (!checkUser) {
        return next(new Error("User not found", { cause: 404 }));
    }

    if (!checkUser.isConfirmed) {
        return next(new Error("Please confirm your email tmm ", { cause: 404 }));
    }
    // ✅ قارن كلمة المرور المشفرة
    const isMatch = await comparehash({ planText: password, valuehash: checkUser.password });

    if (!isMatch) {
        return next(new Error("Password is incorrect", { cause: 404 }));
    }

    // ✅ توليد Access Token و Refresh Token
    const access_Token = generatetoken({
        payload: { id: checkUser._id }
    });

    const refreshToken = generatetoken({
        payload: { id: checkUser._id },
        expiresIn: "365d"
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
        refreshToken
    };

    return successresponse(res, allData, 200);
});


export const getMyProfile = async (req, res, next) => {
    try {
        const userId = req.user._id; // ✅ جاي من التوكن

        // هات بيانات المستخدم من الـ DB مع الحقول اللي محتاجها بس
        const user = await Usermodel.findById(userId)
            .select("fullName email phone totalPoints modelcar serviceType carImages profiePicture isAgree");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "⚠️ المستخدم غير موجود"
            });
        }

        return res.status(200).json({
            success: true,
            message: "✅ تم جلب البروفايل بنجاح",
            data: user
        });

    } catch (error) {
        next(error);
    }
};















export const getMyCompactProfile = async (req, res, next) => {
    try {
        const userId = req.user._id;

        // جلب الحقول المطلوبة بما فيها subscription
        const user = await Usermodel.findById(userId)
            .select("fullName email phone profiePicture subscription");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "⚠️ المستخدم غير موجود"
            });
        }

        const now = new Date();
        const MS_PER_DAY = 1000 * 60 * 60 * 24;

        // نقرأ مباشرة من subscription
        const startDate = user.subscription?.startDate ? new Date(user.subscription.startDate) : null;
        const endDate = user.subscription?.endDate ? new Date(user.subscription.endDate) : null;
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
                endDate
            }
        });

    } catch (error) {
        next(error);
    }
};




export const createOrUpdateSettings = asyncHandelr(async (req, res, next) => {
    const { whatsappNumber, privacyPolicy } = req.body;

    let settings = await AppSettingsSchema.findOne();
    if (!settings) {
        settings = await AppSettingsSchema.create({ whatsappNumber, privacyPolicy });
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
        return successresponse(res, "ℹ️ لا توجد إعدادات حالياً", 200, { settings: [] });
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



export const createCategory = asyncHandelr(async (req, res, next) => {
    const { name, parentCategory, description, status } = req.body;

    // ✅ Validation
    if (!name?.ar || !name?.en) {
        return next(new Error("❌ اسم القسم مطلوب بالعربي والإنجليزي", { cause: 400 }));
    }

    // ✅ Generate slug
    const slug = slugify(name.en, {
        lower: true,
        strict: true
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
                folder: "categories"
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
        images,                    // الصور
        description,               // الوصف (ar / en)
        status                      // الحالة (published | inactive | scheduled)
    });

    res.status(201).json({
        success: true,
        message: " تم إنشاء القسم بنجاح",
        data: category
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
                status: "published" // اختياري: بس المنشورة
            }
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
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // map: categoryId → { productCount, totalPrice }
    const statsMap = {};
    categoryStats.forEach(stat => {
        statsMap[stat._id.toString()] = {
            productCount: stat.productCount || 0,
            totalPrice: stat.totalPrice || 0
        };
    });

    // ✅ دالة لحساب كل subcategories المتداخلة (للحساب التراكمي)
    const getAllSubCategoryIds = (catId, allCats) => {
        const directChildren = allCats.filter(c => 
            c.parentCategory && c.parentCategory._id.toString() === catId.toString()
        );
        let subs = directChildren.map(c => c._id.toString());
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

        allIds.forEach(id => {
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
            .filter(c => {
                if (parentId === null) return !c.parentCategory;
                return c.parentCategory && c.parentCategory._id.toString() === parentId.toString();
            })
            .map(cat => {
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
                    children: children.length > 0 ? children : []
                };
            });
    };

    const tree = buildTree();

    // ✅ حساب الإحصائيات العامة
    const mainCategories = categories.filter(c => !c.parentCategory);
    const subCategories = categories.filter(c => c.parentCategory);

    const stats = {
        totalMainCategories: mainCategories.length,
        totalSubCategories: subCategories.length,
        totalCategories: categories.length
    };

    res.status(200).json({
        success: true,
        message: "تم جلب شجرة الأقسام مع الإحصائيات بنجاح ",
        stats,
        data: tree
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
                totalCategories: 0
            },
            data: null
        });
    }

    // التحقق من وجود القسم المطلوب
    const targetCategory = categories.find(c => c._id.toString() === categoryId);
    if (!targetCategory) {
        return next(new Error("❌ القسم غير موجود أو غير مفعل", { cause: 404 }));
    }

    // جلب إحصائيات المنتجات (نفس الطريقة)
    const categoryStats = await ProductModellll.aggregate([
        {
            $match: {
                isActive: true,
                status: "published"
            }
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
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const statsMap = {};
    categoryStats.forEach(stat => {
        statsMap[stat._id.toString()] = {
            productCount: stat.productCount || 0,
            totalPrice: stat.totalPrice || 0
        };
    });

    // دالة لحساب كل subcategories المتداخلة
    const getAllSubCategoryIds = (catId, allCats) => {
        const directChildren = allCats.filter(c =>
            c.parentCategory && c.parentCategory._id.toString() === catId.toString()
        );
        let subs = directChildren.map(c => c._id.toString());
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

        allIds.forEach(id => {
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
        const cat = categories.find(c => c._id.toString() === catId);
        if (!cat) return null;

        const stats = getCategoryStats(catId, categories);
        const children = categories
            .filter(c => c.parentCategory && c.parentCategory._id.toString() === catId)
            .map(child => buildSubTree(child._id.toString()))
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
            children: children.length > 0 ? children : []
        };
    };

    const tree = buildSubTree(categoryId);

    // حساب الإحصائيات العامة (للقسم وفرعياته فقط)
    const allSubIds = getAllSubCategoryIds(categoryId, categories);
    const allIdsInTree = [categoryId, ...allSubIds];

    const mainInTree = allIdsInTree.filter(id =>
        !categories.find(c => c.parentCategory && c.parentCategory._id.toString() === id)
    ).length;

    const subInTree = allIdsInTree.length - mainInTree;

    const stats = {
        totalMainCategories: tree.parentCategory ? 0 : 1, // لو القسم رئيسي → 1، غير كده 0
        totalSubCategories: subInTree,
        totalCategories: allIdsInTree.length
    };

    res.status(200).json({
        success: true,
        message: "تم جلب شجرة القسم مع الفرعيات والإحصائيات بنجاح ✅",
        stats,
        data: tree
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
                _id: { $ne: categoryId }
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
                folder: "categories"
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
        data: category
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
        message: " تم حذف القسم بنجاح"
    });
});



// Product

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
        return next(new Error("❌ طلب الانضمام كبائع لم يُقبل بعد", { cause: 403 }));
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
        return next(new Error("❌ اسم المنتج مطلوب بالعربي والإنجليزي", { cause: 400 }));
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
        isActive: true
    });
    if (categoriesCount !== categories.length) {
        return next(new Error("❌ قسم أو أكثر غير موجود أو غير مفعل", { cause: 400 }));
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
            folder: "products"
        });
        images.push(result.secure_url);
        fs.unlinkSync(file.path); // حذف الملف المؤقت
    }

    // إنشاء Slug للـ SEO
    const seoSlug = slugify(seo?.slug || name.en, { lower: true, strict: true });
    const slugExists = await ProductModellll.findOne({ "seo.slug": seoSlug });
    if (slugExists) {
        return next(new Error("❌ هذا الـ slug مستخدم بالفعل، اختر اسم آخر", { cause: 409 }));
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
            rate: tax?.rate || 0
        },
        bulkDiscounts: bulkDiscounts || [],
        currency,
        weight,
        stock,
        hasVariants,
        inStock,
        unlimitedStock,
        tags: tags.map(tag => tag.toLowerCase().trim()),
        status,
        seo: {
            title: seo?.title || name.en,
            description: seo?.description || description?.en || "",
            slug: seoSlug
        },
        rating: {
            average: 0,
            count: 0
        },
        isActive: true,
        createdBy: req.user._id  // ← هنا التوكن بيشتغل (مين اللي أنشأ المنتج)
    });

    res.status(201).json({
        success: true,
        message: "تم إنشاء المنتج بنجاح ✅",
        data: product
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
        limit = 10
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
            return next(new Error("قيمة status غير صحيحة. استخدم: published, inactive, scheduled", { cause: 400 }));
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
                isActive: true
            }).select('_id');

            let subs = [];
            for (const child of children) {
                subs.push(child._id);
                subs.push(...await getAllSubCategoryIds(child._id));
            }
            return subs;
        };

        const subCategoryIds = await getAllSubCategoryIds(category);
        const allCategoryIds = [category, ...subCategoryIds];
        filter.categories = { $in: allCategoryIds };
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
                select: "name slug"
            }
        })
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

    const totalProducts = await ProductModellll.countDocuments(filter);

    let products = await productsQuery.lean();

    // باقي الكود زي ما هو بالضبط (stock، variant، summary، pagination، children)
    // ... (كل الكود من variantStockMap لحد الـ res.json)

    // (نفس الكود اللي عندك من هنا لحد النهاية بدون أي تغيير)

    // ✅ جلب stock الكلي من الـ variants
    const productsWithVariants = products.filter(p => p.hasVariants).map(p => p._id);
    let variantStockMap = {};
    if (productsWithVariants.length > 0) {
        const variantStocks = await VariantModel.aggregate([
            { $match: { productId: { $in: productsWithVariants }, isActive: true } },
            { $group: { _id: "$productId", totalVariantStock: { $sum: "$stock" }, variantCount: { $sum: 1 } } }
        ]);
        variantStocks.forEach(v => {
            variantStockMap[v._id.toString()] = {
                total: v.totalVariantStock || 0,
                count: v.variantCount || 0
            };
        });
    }

    // دالة حساب stockStatus
    const calculateStockStatus = (product) => {
        if (!product.isActive || product.status !== "published") {
            return { status: "غير نشط", total: 0, available: 0, lowStock: 0, outOfStock: 0, inactive: 1 };
        }
        if (product.unlimitedStock) {
            return { status: "متوفر في المخزون", total: 999999, available: 1, lowStock: 0, outOfStock: 0, inactive: 0 };
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
            lowStock: (effectiveStock > 0 && effectiveStock <= 10) ? 1 : 0,
            outOfStock: effectiveStock === 0 ? 1 : 0,
            inactive: 0
        };
    };

    products = products.map(product => ({
        ...product,
        stockStatus: calculateStockStatus(product),
        ...(product.hasVariants && variantStockMap[product._id.toString()] ? {
            variantInfo: {
                totalVariants: variantStockMap[product._id.toString()].count,
                totalVariantStock: variantStockMap[product._id.toString()].total
            }
        } : {})
    }));

    if (stock) {
        const validStocks = ["available", "low", "out", "inactive"];
        if (!validStocks.includes(stock)) {
            return next(new Error("قيمة stock غير صحيحة. استخدم: available, low, out, inactive", { cause: 400 }));
        }
        const statusMap = {
            available: "متوفر في المخزون",
            low: "قارب على النفاد",
            out: "نفد من المخزون",
            inactive: "غير نشط"
        };
        products = products.filter(p => p.stockStatus.status === statusMap[stock]);
    }

    const categoryIds = products.flatMap(p => p.categories.map(c => c._id.toString()));
    let childrenMap = {};
    if (categoryIds.length > 0) {
        const children = await CategoryModellll.find({
            parentCategory: { $in: categoryIds },
            isActive: true
        }).select("name slug parentCategory").lean();
        children.forEach(child => {
            const parentId = child.parentCategory.toString();
            if (!childrenMap[parentId]) childrenMap[parentId] = [];
            childrenMap[parentId].push({ _id: child._id, name: child.name, slug: child.slug });
        });
    }
    products.forEach(product => {
        product.categories.forEach(category => {
            category.children = childrenMap[category._id.toString()] || [];
        });
    });

    const summary = {
        totalProducts: products.length,
        available: products.filter(p => p.stockStatus.status === "متوفر في المخزون").length,
        lowStock: products.filter(p => p.stockStatus.status === "قارب على النفاد").length,
        outOfStock: products.filter(p => p.stockStatus.status === "نفد من المخزون").length,
        inactive: products.filter(p => p.stockStatus.status === "غير نشط").length
    };

    const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalItems: totalProducts,
        itemsPerPage: limitNum,
        hasNext: pageNum < Math.ceil(totalProducts / limitNum),
        hasPrev: pageNum > 1
    };

    res.status(200).json({
        success: true,
        message: "تم جلب المنتجات بنجاح ✅",
        count: products.length,
        summary,
        pagination,
        data: products
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
                select: "name slug"
            }
        })
        .select('-__v')
        .lean();

    if (!product) {
        return next(new Error("❌ المنتج غير موجود أو غير متاح لك", { cause: 404 }));
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
                    variantCount: { $sum: 1 }
                }
            }
        ]);

        if (variantStock.length > 0) {
            effectiveStock = variantStock[0].totalVariantStock || 0;
            variantInfo = {
                totalVariants: variantStock[0].variantCount,
                totalVariantStock: variantStock[0].totalVariantStock
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
    const categoryIds = product.categories.map(c => c._id.toString());
    let childrenMap = {};

    if (categoryIds.length > 0) {
        const children = await CategoryModellll.find({
            parentCategory: { $in: categoryIds },
            isActive: true
        }).select("name slug parentCategory").lean();

        children.forEach(child => {
            const parentId = child.parentCategory.toString();
            if (!childrenMap[parentId]) childrenMap[parentId] = [];
            childrenMap[parentId].push({ _id: child._id, name: child.name, slug: child.slug });
        });
    }

    product.categories.forEach(category => {
        category.children = childrenMap[category._id.toString()] || [];
    });

    // ✅ إضافة الحقول الجديدة
    const formattedProduct = {
        ...product,
        stockStatus,
        ...(product.hasVariants ? { variantInfo } : {})
    };

    res.status(200).json({
        success: true,
        message: "تم جلب المنتج بنجاح ✅",
        data: formattedProduct
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
        isActive
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
                _id: { $ne: productId }
            });
            if (slugExists) {
                return next(new Error("❌ هذا الـ slug مستخدم في منتج آخر", { cause: 409 }));
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
            isActive: true
        });
        if (categoriesCount !== categories.length) {
            return next(new Error("❌ قسم أو أكثر غير موجود أو غير مفعل", { cause: 400 }));
        }
        product.categories = categories;
    }

    // ✅ تعديل الحقول البسيطة
    if (status) product.status = status;

    if (sku !== undefined) {
        if (sku.trim() === "") {
            product.sku = undefined;
        } else {
            const skuExists = await ProductModellll.findOne({ sku: sku.trim(), _id: { $ne: productId } });
            if (skuExists) return next(new Error("❌ هذا SKU مستخدم في منتج آخر", { cause: 409 }));
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
    if (unlimitedStock !== undefined) product.unlimitedStock = toBoolean(unlimitedStock);

    // ✅ تعديل المخزون
    if (stock !== undefined) product.stock = Math.max(0, Number(stock) || 0);

    // ✅ تعديل الضريبة
    if (tax) {
        if (tax.enabled !== undefined) product.tax.enabled = toBoolean(tax.enabled);
        if (tax.rate !== undefined) product.tax.rate = Math.max(0, Number(tax.rate) || 0);
    }

    // ✅ تعديل الـ tags
    if (tags && Array.isArray(tags)) {
        product.tags = tags.map(tag => tag.toLowerCase().trim()).filter(Boolean);
    }

    // ✅ تعديل bulkDiscounts
    if (bulkDiscounts && Array.isArray(bulkDiscounts)) {
        product.bulkDiscounts = bulkDiscounts.map(d => ({
            minQty: Number(d.minQty),
            maxQty: Number(d.maxQty),
            discountPercent: Math.min(100, Math.max(1, Number(d.discountPercent)))
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
                folder: "products"
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
            product.images = product.images.filter(img => !imagesToRemove.includes(img));
        }
    }

    await product.save();

    res.status(200).json({
        success: true,
        message: "تم تعديل المنتج بنجاح ✅",
        data: product
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
            isActive: product.isActive
        }
    });
});




// variants




export const createVariant = asyncHandelr(async (req, res, next) => {
    const { productId, attributes, price, stock, sku, disCountPrice } = req.body;

    // ✅ Validation أساسية
    if (!productId) {
        return next(new Error("❌ productId مطلوب", { cause: 400 }));
    }

    if (!price || isNaN(price) || Number(price) <= 0) {
        return next(new Error("❌ السعر مطلوب ويجب أن يكون رقم موجب", { cause: 400 }));
    }

    if (!disCountPrice || isNaN(disCountPrice) || Number(disCountPrice) <= 0) {
        return next(new Error("❌ السعر مطلوب ويجب أن يكون رقم موجب", { cause: 400 }));
    }


    if (stock === undefined || stock === null || isNaN(stock) || Number(stock) < 0) {
        return next(new Error("❌ المخزون مطلوب ويجب أن يكون رقم غير سالب", { cause: 400 }));
    }

    if (!req.files || req.files.length === 0) {
        return next(new Error("❌ يجب رفع صورة واحدة على الأقل للمتغير", { cause: 400 }));
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
            return next(new Error("❌ يجب اختيار متغير واحد على الأقل (attribute)", { cause: 400 }));
        }
    } catch (error) {
        return next(new Error("❌ صيغة JSON للـ attributes غير صحيحة", { cause: 400 }));
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
        return next(new Error("❌ هذا المنتج لا يدعم المتغيرات (hasVariants = false)", { cause: 400 }));
    }

    // ✅ التحقق من صحة الـ attributeId و valueId
    for (const attr of parsedAttributes) {
        if (!attr.attributeId || !attr.valueId) {
            return next(new Error("❌ كل متغير يجب أن يحتوي على attributeId و valueId", { cause: 400 }));
        }

        // تحقق من وجود الـ Attribute والـ Value وأنهم مفعلين
        const attribute = await AttributeModell.findOne({
            _id: attr.attributeId,
            isActive: true
        });
        if (!attribute) {
            return next(new Error(`❌ الخاصية (Attribute) غير موجودة أو غير مفعلة: ${attr.attributeId}`, { cause: 400 }));
        }

        const value = await AttributeValueModel.findOne({
            _id: attr.valueId,
            attributeId: attr.attributeId,
            isActive: true
        });
        if (!value) {
            return next(new Error(`❌ القيمة (Value) غير موجودة أو غير مطابقة للخاصية: ${attr.valueId}`, { cause: 400 }));
        }
    }

    // ✅ رفع الصور إلى Cloudinary
    const images = [];
    for (const file of req.files) {
        const result = await cloud.uploader.upload(file.path, {
            folder: "variants"
        });
        images.push({
            url: result.secure_url,
            public_id: result.public_id
        });
        fs.unlinkSync(file.path); // حذف الملف المؤقت
    }

    // ✅ إنشاء المتغير
    const variant = await VariantModel.create({
        productId,
        attributes: parsedAttributes.map(attr => ({
            attributeId: attr.attributeId,
            valueId: attr.valueId
        })),
        price: Number(price),
        stock: Number(stock),
        sku,
        disCountPrice: Number(disCountPrice),
        images
    });

    res.status(201).json({
        success: true,
        message: "تم إنشاء المتغير بنجاح ",
        data: variant
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
            data: []
        });
    }

    // ✅ جلب المتغيرات مع populate كامل للـ attributes والـ values
    const variants = await VariantModel.find({
        productId,
        isActive: true
    })
        .populate({
            path: "attributes.attributeId",
            match: { isActive: true },
            select: "name type"
        })
        .populate({
            path: "attributes.valueId",
            match: { isActive: true },
            select: "value hexCode"
        })
        .sort({ createdAt: -1 })
        .lean(); // عشان نقدر نعدل عليها بسهولة

    // ✅ تنظيف وتحسين شكل الـ attributes للـ frontend
    const formattedVariants = variants.map(variant => {
        // فلترة أي attribute فشل في الـ populate (لو attribute أو value محذوفة أو غير مفعلة)
        const validAttributes = variant.attributes.filter(
            attr => attr.attributeId && attr.valueId
        );

        // تحويل إلى شكل أوضح: array من objects مع كل التفاصيل
        const attributes = validAttributes.map(attr => ({
            name: attr.attributeId.name,        // { ar: "اللون", en: "Color" }
            type: attr.attributeId.type,        // مثلاً "color" أو "select"
            value: attr.valueId.value,          // { ar: "أحمر", en: "Red" }
            hexCode: attr.valueId.hexCode || null
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
            images: variant.images,
            isActive: variant.isActive,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
            attributes // أو attributesObj لو عايز object
        };
    });

    res.status(200).json({
        success: true,
        message: "تم جلب المتغيرات بنجاح ",
        count: formattedVariants.length,
        data: formattedVariants
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
                return next(new Error("❌ يجب إرسال متغير واحد على الأقل (attribute)", { cause: 400 }));
            }

            // التحقق الأساسي من البنية
            for (const attr of parsedAttributes) {
                if (!attr.attributeId || !attr.valueId) {
                    return next(new Error("❌ كل attribute يجب أن يحتوي على attributeId و valueId", { cause: 400 }));
                }
            }

            // التحقق من وجود الـ attribute و value وأنهم مفعلين (اختياري للأمان)
            for (const attr of parsedAttributes) {
                const attribute = await AttributeModell.findOne({ _id: attr.attributeId, isActive: true });
                if (!attribute) {
                    return next(new Error(`❌ الخاصية غير موجودة أو غير مفعلة: ${attr.attributeId}`, { cause: 400 }));
                }

                const value = await AttributeValueModel.findOne({
                    _id: attr.valueId,
                    attributeId: attr.attributeId,
                    isActive: true
                });
                if (!value) {
                    return next(new Error(`❌ القيمة غير موجودة أو غير مطابقة: ${attr.valueId}`, { cause: 400 }));
                }
            }

            variant.attributes = parsedAttributes.map(attr => ({
                attributeId: attr.attributeId,
                valueId: attr.valueId
            }));
        } catch (error) {
            return next(new Error("❌ صيغة JSON للـ attributes غير صحيحة", { cause: 400 }));
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
            return next(new Error("❌ المخزون يجب أن يكون رقم غير سالب", { cause: 400 }));
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
                _id: { $ne: variantId }
            });
            if (skuExists) {
                return next(new Error("❌ هذا SKU مستخدم في متغير آخر", { cause: 409 }));
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
                folder: "variants"
            });
            newImages.push({
                url: result.secure_url,
                public_id: result.public_id
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
            select: "name type"
        })
        .populate({
            path: "attributes.valueId",
            match: { isActive: true },
            select: "value hexCode"
        })
        .lean();

    // تنسيق الـ attributes للـ frontend
    const validAttributes = updatedVariant.attributes.filter(
        attr => attr.attributeId && attr.valueId
    );

    const formattedAttributes = validAttributes.map(attr => ({
        name: attr.attributeId.name,
        type: attr.attributeId.type,
        value: attr.valueId.value,
        hexCode: attr.valueId.hexCode || null
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
        attributes: formattedAttributes
    };

    res.status(200).json({
        success: true,
        message: "تم تعديل المتغير بنجاح ",
        data: responseData
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
        message: " تم حذف المتغير بنجاح"
    });
});







export const filterProducts = asyncHandelr(async (req, res, next) => {
    const {
        lang = "en",
        page = 1,
        limit = 10,
        color,      // مثال: "أحمر" أو "Red"
        size        // مثال: "42" أو "M"
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
                orConditions.push(
                    { [`value.${lang}`]: color },
                    { "value.en": color }
                );
            }
            if (size) {
                orConditions.push(
                    { [`value.${lang}`]: size },
                    { "value.en": size }
                );
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
                    hasPrev: false
                },
                data: []
            });
        }

        matchingValueIds = matchingValues.map(v => v._id);
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
                hasPrev: false
            },
            data: []
        });
    }

    // استخراج productIds الفريدة
    const productIds = [...new Set(matchingVariants.map(v => v.productId.toString()))];

    const totalProducts = productIds.length;

    // pagination على الـ productIds
    const paginatedProductIds = productIds.slice(skip, skip + limitNum);

    // جلب المنتجات
    let products = await ProductModellll.find({
        _id: { $in: paginatedProductIds },
        isActive: true,
        status: "published"
    })
        .populate({
            path: "categories",
            match: { isActive: true },
            select: "name slug"
        })
        .populate({
            path: "brands",
            match: { isActive: true },
            select: "name image"
        })
        .select("-__v")
        .lean();

    // جلب كل الـ variants للمنتجات في الصفحة (مش بس المفلترة)
    const productIdsInPage = products.map(p => p._id);
    let variantsMap = {};

    if (productIdsInPage.length > 0) {
        const allVariants = await VariantModel.find({
            productId: { $in: productIdsInPage },
            isActive: true
        })
            .populate({
                path: "attributes.attributeId",
                select: "name"
            })
            .populate({
                path: "attributes.valueId",
                select: "value hexCode"
            })
            .lean();

        allVariants.forEach(variant => {
            if (!variantsMap[variant.productId]) {
                variantsMap[variant.productId] = [];
            }

            const formattedAttributes = variant.attributes
                .filter(attr => attr.attributeId && attr.valueId)
                .map(attr => ({
                    attributeName: attr.attributeId.name[lang] || attr.attributeId.name.en,
                    value: attr.valueId.value[lang] || attr.valueId.value.en,
                    hexCode: attr.valueId.hexCode || null
                }));

            variantsMap[variant.productId].push({
                _id: variant._id,
                price: variant.price,
                stock: variant.stock,
                images: variant.images,
                attributes: formattedAttributes
            });
        });
    }

    // تنسيق المنتجات (نفس GetAllProducts)
    const formattedProducts = products.map(product => {
        const baseProduct = {
            _id: product._id,
            name: product.name[lang] || product.name.en,
            description: product.description?.[lang] || product.description?.en || "",
            categories: (product.categories || []).map(cat => ({
                _id: cat._id,
                name: cat.name[lang] || cat.name.en,
                slug: cat.slug
            })),
            brands: (product.brands || []).map(brand => ({
                _id: brand._id,
                name: brand.name[lang] || brand.name.en,
                image: brand.image
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
            bulkDiscounts: product.bulkDiscounts || []
        };

        return {
            ...baseProduct,
            variants: variantsMap[product._id.toString()] || []
        };
    });

    const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalItems: totalProducts,
        itemsPerPage: limitNum,
        hasNext: pageNum < Math.ceil(totalProducts / limitNum),
        hasPrev: pageNum > 1
    };

    res.status(200).json({
        success: true,
        message: "تم فلترة المنتجات بنجاح ✅",
        count: formattedProducts.length,
        pagination,
        data: formattedProducts
    });
});



export const GetAllProducts = asyncHandelr(async (req, res, next) => {
    const {
        page = 1,
        limit = 10
    } = req.query;

    const userLanguage = req.user.lang;

    // تحويل وتأمين القيم
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10)); // max 50 للأداء
    const skip = (pageNum - 1) * limitNum;

    // جلب عدد المنتجات الكلي للـ pagination
    const totalProducts = await ProductModellll.countDocuments({
        isActive: true,
        status: "published"
    });

    // جلب المنتجات مع pagination + populate
    let products = await ProductModellll.find({
        isActive: true,
        status: "published"
    })
        .populate({
            path: "categories",
            match: { isActive: true },
            select: "name slug"
        })
        .populate({
            path: "brands",
            match: { isActive: true },
            select: "name image"
        })
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    // جلب الـ variants فقط للمنتجات الموجودة في الصفحة الحالية
    const productIdsWithVariants = products
        .filter(p => p.hasVariants)
        .map(p => p._id);

    let variantsMap = {};

    if (productIdsWithVariants.length > 0) {
        const variants = await VariantModel.find({
            productId: { $in: productIdsWithVariants },
            isActive: true
        })
            .populate({
                path: "attributes.attributeId",
                select: "name"
            })
            .populate({
                path: "attributes.valueId",
                select: "value hexCode"
            })
            .lean();

        variants.forEach(variant => {
            if (!variantsMap[variant.productId]) {
                variantsMap[variant.productId] = [];
            }

            const formattedAttributes = variant.attributes
                .filter(attr => attr.attributeId && attr.valueId)
                .map(attr => ({
                    attributeName: attr.attributeId.name[userLanguage] || attr.attributeId.name.en,
                    value: attr.valueId.value[userLanguage] || attr.valueId.value.en,
                    hexCode: attr.valueId.hexCode || null
                }));

            variantsMap[variant.productId].push({
                _id: variant._id,
                price: variant.price,
                stock: variant.stock,
                images: variant.images,
                attributes: formattedAttributes
            });
        });
    }

    // تنسيق المنتجات النهائي
    const formattedProducts = products.map(product => {
        const baseProduct = {
            _id: product._id,
            name: product.name[userLanguage] || product.name.en,
            description: product.description?.[userLanguage] || product.description?.en || "",
            categories: (product.categories || []).map(cat => ({
                _id: cat._id,
                name: cat.name[userLanguage] || cat.name.en,
                slug: cat.slug
            })),
            brands: (product.brands || []).map(brand => ({
                _id: brand._id,
                name: brand.name[userLanguage] || brand.name.en,
                image: brand.image
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
            bulkDiscounts: product.bulkDiscounts || []
        };

        if (product.hasVariants) {
            return {
                ...baseProduct,
                variants: variantsMap[product._id.toString()] || []
            };
        } else {
            return {
                ...baseProduct,
                price: product.mainPrice,
                stock: product.unlimitedStock ? "unlimited" : product.stock,
                variants: []
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
        hasPrev: pageNum > 1
    };
    // as a test 
    const finalProducts = await convertProductPrices(formattedProducts , req.user.currency)

    res.status(200).json({
        success: true,
        message: "تم جلب المنتجات بنجاح مع التصفح الصفحي ",
        count: formattedProducts.length,
        pagination,
        data: finalProducts
    });
});


///////////////////////////////////////////////////


///////////////////////////////////////////////////



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
            data: []
        });
    }

    // تنسيق الأقسام مع ترجمة الأسماء
    const formattedCategories = categories.map(cat => ({
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
                slug: cat.parentCategory.slug
            }
            : null
    }));

    // بناء الشجرة الهرمية
    const categoryMap = {};
    const tree = [];

    // أولاً: نحط كل قسم في map عشان الوصول السريع
    formattedCategories.forEach(cat => {
        categoryMap[cat._id] = {
            ...cat,
            children: []
        };
    });

    // ثانيًا: نربط الأبناء بالآباء
    formattedCategories.forEach(cat => {
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
        data: tree
    });
});


export const GetProductsByCategory = asyncHandelr(async (req, res, next) => {
    const { categoryId } = req.params;
    const {
        lang = "en",
        page = 1,
        limit = 10
    } = req.query;

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
            isActive: true
        }).select('_id');

        let subs = children.map(c => c._id);
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
        categories: { $in: allCategoryIds }
    };

    // عدد المنتجات الكلي في القسم (للـ pagination)
    const totalProducts = await ProductModellll.countDocuments(filter);

    // جلب المنتجات مع pagination
    let products = await ProductModellll.find(filter)
        .populate({
            path: "categories",
            match: { isActive: true },
            select: "name slug"
        })
        .populate({
            path: "brands",
            match: { isActive: true },
            select: "name image"
        })
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    // جلب الـ variants للمنتجات في الصفحة الحالية فقط
    const productIdsWithVariants = products
        .filter(p => p.hasVariants)
        .map(p => p._id);

    let variantsMap = {};

    if (productIdsWithVariants.length > 0) {
        const variants = await VariantModel.find({
            productId: { $in: productIdsWithVariants },
            isActive: true
        })
            .populate({
                path: "attributes.attributeId",
                select: "name"
            })
            .populate({
                path: "attributes.valueId",
                select: "value hexCode"
            })
            .lean();

        variants.forEach(variant => {
            if (!variantsMap[variant.productId]) {
                variantsMap[variant.productId] = [];
            }

            const formattedAttributes = variant.attributes
                .filter(attr => attr.attributeId && attr.valueId)
                .map(attr => ({
                    attributeName: attr.attributeId.name[lang] || attr.attributeId.name.en,
                    value: attr.valueId.value[lang] || attr.valueId.value.en,
                    hexCode: attr.valueId.hexCode || null
                }));

            variantsMap[variant.productId].push({
                _id: variant._id,
                price: variant.price,
                stock: variant.stock,
                images: variant.images,
                attributes: formattedAttributes
            });
        });
    }

    // تنسيق المنتجات (نفس GetAllProducts بالضبط)
    const formattedProducts = products.map(product => {
        const baseProduct = {
            _id: product._id,
            name: product.name[lang] || product.name.en,
            description: product.description?.[lang] || product.description?.en || "",
            categories: (product.categories || []).map(cat => ({
                _id: cat._id,
                name: cat.name[lang] || cat.name.en,
                slug: cat.slug
            })),
            brands: (product.brands || []).map(brand => ({
                _id: brand._id,
                name: brand.name[lang] || brand.name.en,
                image: brand.image
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
            bulkDiscounts: product.bulkDiscounts || []
        };

        if (product.hasVariants) {
            return {
                ...baseProduct,
                variants: variantsMap[product._id.toString()] || []
            };
        } else {
            return {
                ...baseProduct,
                price: product.mainPrice,
                stock: product.unlimitedStock ? "unlimited" : product.stock,
                variants: []
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
        hasPrev: pageNum > 1
    };

    res.status(200).json({
        success: true,
        message: "تم جلب المنتجات في القسم بنجاح مع التصفح الصفحي ✅",
        count: formattedProducts.length,
        pagination,
        data: formattedProducts
    });
});

export const createBrand = asyncHandelr(async (req, res, next) => {
    const { name, description } = req.body;

    // ✅ Validation
    if (!name?.ar || !name?.en) {
        return next(new Error("❌ اسم البراند مطلوب بالعربي والإنجليزي", { cause: 400 }));
    }

    if (!req.file) {
        return next(new Error("❌ يجب رفع صورة للبراند", { cause: 400 }));
    }

    // ✅ رفع الصورة إلى Cloudinary
    const result = await cloud.uploader.upload(req.file.path, {
        folder: "brands"
    });
    fs.unlinkSync(req.file.path);

    // ✅ إنشاء البراند
    const brand = await BrandModel.create({
        name: {
            ar: name.ar.trim(),
            en: name.en.trim()
        },
        description: {
            ar: description?.ar?.trim() || "",
            en: description?.en?.trim() || ""
        },
        image: {
            url: result.secure_url,
            public_id: result.public_id
        }
    });

    res.status(201).json({
        success: true,
        message: "تم إنشاء البراند بنجاح ✅",
        data: brand
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
                status: "published" // اختياري: بس المنتجات المنشورة
            }
        },
        { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$brands",
                productCount: { $sum: 1 }
            }
        }
    ]);

    // تحويل إلى map للوصول السريع: brandId → productCount
    const brandProductCountMap = {};
    let totalProducts = 0;
    brandStats.forEach(stat => {
        if (stat._id) { // تجاهل null (منتجات بدون براند)
            brandProductCountMap[stat._id.toString()] = stat.productCount;
            totalProducts += stat.productCount;
        }
    });

    // ✅ إضافة productCount لكل براند
    brands = brands.map(brand => ({
        ...brand,
        productCount: brandProductCountMap[brand._id.toString()] || 0
    }));

    // ✅ حساب الإحصائيات العامة
    const totalBrands = brands.length;
    const averageProductsPerBrand = totalBrands > 0 
        ? Math.round(totalProducts / totalBrands) 
        : 0;

    // العلامة الأعلى منتجات
    let topBrand = null;
    if (brands.length > 0) {
        const sorted = [...brands].sort((a, b) => b.productCount - a.productCount);
        const highest = sorted[0];
        if (highest.productCount > 0) {
            topBrand = {
                name: highest.name,
                productCount: highest.productCount
            };
        }
    }

    // ✅ الإحصائيات النهائية
    const stats = {
        totalBrands,
        totalProducts,
        averageProductsPerBrand,
        topBrand: topBrand || { name: { ar: "-", en: "-" }, productCount: 0 }
    };

    res.status(200).json({
        success: true,
        message: "تم جلب العلامات التجارية مع الإحصائيات بنجاح ✅",
        stats,
        count: brands.length,
        data: brands
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
        isActive: true
    })
        .select("name description image createdAt")
        .lean();

    if (!brand) {
        return next(new Error("❌ العلامة التجارية غير موجودة أو غير مفعلة", { cause: 404 }));
    }

    // جلب إحصائيات المنتجات لكل البراندات (عشان نحسب المتوسط والأعلى)
    const brandStats = await ProductModellll.aggregate([
        {
            $match: {
                isActive: true,
                status: "published"
            }
        },
        { $unwind: { path: "$brands", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: "$brands",
                productCount: { $sum: 1 }
            }
        }
    ]);

    const brandProductCountMap = {};
    let totalProducts = 0;
    brandStats.forEach(stat => {
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

    const averageProductsPerBrand = totalBrands > 0
        ? Math.round(totalProducts / totalBrands)
        : 0;

    // هل هذا البراند الأعلى؟
    let isTopBrand = false;
    let topBrandCount = 0;
    if (Object.keys(brandProductCountMap).length > 0) {
        topBrandCount = Math.max(...Object.values(brandProductCountMap));
        isTopBrand = thisBrandProductCount === topBrandCount && thisBrandProductCount > 0;
    }

    const formattedBrand = {
        _id: brand._id,
        name: brand.name,
        description: brand.description || { ar: "", en: "" },
        image: brand.image,
        createdAt: brand.createdAt,
        productCount: thisBrandProductCount
    };

    const stats = {
        totalBrands,
        totalProducts,
        averageProductsPerBrand,
        thisBrandProductCount,
        isTopBrand,
        topBrandMaxCount: topBrandCount
    };

    res.status(200).json({
        success: true,
        message: "تم جلب العلامة التجارية مع الإحصائيات بنجاح ✅",
        stats,
        data: formattedBrand
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
            folder: "brands"
        });
        fs.unlinkSync(req.file.path);

        brand.image = {
            url: result.secure_url,
            public_id: result.public_id
        };
    }

    await brand.save();

    res.status(200).json({
        success: true,
        message: "تم تعديل البراند بنجاح ✅",
        data: brand
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
        message: " تم حذف البراند بنجاح"
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
        return next(new Error("❌ اسم الخاصية مطلوب بالعربي والإنجليزي", { cause: 400 }));
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
            en: name.en.trim()
        },
        type: type.trim(),
        createdBy: req.user._id // ← هنا التوكن بيشتغل
    });

    // جلب الخاصية مع اسم المستخدم اللي أنشأها (اختياري للـ response)
    const populatedAttribute = await AttributeModell.findById(attribute._id)
        .populate("createdBy", "fullName email")
        .lean();

    res.status(201).json({
        success: true,
        message: "تم إنشاء الخاصية بنجاح ✅",
        data: populatedAttribute
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
        "attributes.attributeId": attributeId
    });

    if (usedInVariants > 0) {
        return next(new Error("❌ لا يمكن حذف الخاصية لأنها مستخدمة في متغيرات منتجات", { cause: 400 }));
    }

    // Soft delete: نغير isActive إلى false
    attribute.isActive = false;
    await attribute.save();

    // اختياري: حذف القيم المرتبطة (أو نعمل soft delete ليها كمان)
    await AttributeValueModel.updateMany(
        { attributeId },
        { isActive: false }
    );

    res.status(200).json({
        success: true,
        message: "تم حذف الخاصية بنجاح (تم إلغاء تفعيلها) ✅",
        data: {
            _id: attribute._id,
            name: attribute.name,
            isActive: false
        }
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
            return next(new Error("❌ اسم الخاصية مطلوب بالعربي والإنجليزي", { cause: 400 }));
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
            en: name.en.trim()
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
        data: attribute
    });
});





export const createAttributeValue = asyncHandelr(async (req, res, next) => {
    const { attributeId, value, hexCode } = req.body;

    // ✅ التحقق من وجود مستخدم مسجل دخول
    if (!req.user) {
        return next(new Error("❌ يجب تسجيل الدخول لإضافة قيمة خاصية", { cause: 401 }));
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
        return next(new Error("❌ قيمة الخاصية مطلوبة بالعربي والإنجليزي", { cause: 400 }));
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
            en: value.en.trim()
        },
        hexCode: hexCode ? hexCode.trim() : null,
        createdBy: req.user._id  // ← هنا التوكن بيشتغل
    });

    // جلب القيمة مع اسم المستخدم اللي أنشأها (اختياري)
    const populatedValue = await AttributeValueModel.findById(attributeValue._id)
        .populate("createdBy", "fullName email")
        .lean();

    res.status(201).json({
        success: true,
        message: "تم إضافة القيمة بنجاح ✅",
        data: populatedValue
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
                mostCommonType: { type: "-", count: 0 }
            },
            data: []
        });
    }

    const attributeIds = attributes.map(a => a._id);

    // جلب القيم اللي تابعة للخصائص دي فقط + اللي أنشأها المستخدم (لو بائع)
    let valueFilter = {
        attributeId: { $in: attributeIds },
        isActive: true
    };

    if (isVendor) {
        valueFilter.createdBy = req.user._id;
    }

    const values = await AttributeValueModel.find(valueFilter)
        .populate("createdBy", "fullName email")
        .lean();

    // تنسيق البيانات
    const result = attributes.map(attr => ({
        _id: attr._id,
        name: attr.name,
        type: attr.type,
        createdBy: attr.createdBy ? {
            _id: attr.createdBy._id,
            fullName: attr.createdBy.fullName,
            email: attr.createdBy.email
        } : null,
        createdAt: attr.createdAt,
        values: values.filter(v =>
            v.attributeId.toString() === attr._id.toString()
        ).map(v => ({
            _id: v._id,
            value: v.value,
            hexCode: v.hexCode || null,
            createdBy: v.createdBy ? {
                _id: v.createdBy._id,
                fullName: v.createdBy.fullName,
                email: v.createdBy.email
            } : null,
            createdAt: v.createdAt
        }))
    }));

    // حساب الإحصائيات
    const totalAttributes = attributes.length;
    const totalValues = values.length;
    const averageValuesPerAttribute = totalAttributes > 0
        ? Math.round(totalValues / totalAttributes)
        : 0;

    const typeCounts = {};
    result.forEach(attr => {
        const type = attr.type || "unknown";
        const valueCount = attr.values.length;
        typeCounts[type] = (typeCounts[type] || 0) + valueCount;
    });

    let mostCommonType = { type: "-", count: 0 };
    if (Object.keys(typeCounts).length > 0) {
        const maxType = Object.keys(typeCounts).reduce((a, b) =>
            typeCounts[a] > typeCounts[b] ? a : b
        );
        mostCommonType = { type: maxType, count: typeCounts[maxType] };
    }

    const stats = {
        totalAttributes,
        totalValues,
        averageValuesPerAttribute,
        mostCommonType
    };

    res.status(200).json({
        success: true,
        message: isVendor
            ? "تم جلب الخصائص والقيم التي أنشأتها بنجاح ✅"
            : "تم جلب جميع الخصائص والقيم في النظام بنجاح ✅",
        stats,
        data: result
    });
});


export const getAttributeValues = asyncHandelr(async (req, res, next) => {
    const { attributeId } = req.params;

    const values = await AttributeValueModel.find({
        attributeId,
        isActive: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        message: "تم جلب القيم بنجاح",
        data: values
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
            data: []
        });
    }

    // تنسيق البيانات مع الترجمة حسب اللغة
    const formattedBrands = brands.map(brand => ({
        _id: brand._id,
        name: brand.name[lang] || brand.name.en, // لو اللغة مش موجودة، يرجع الإنجليزي
        description: brand.description?.[lang] || brand.description?.en || "",
        image: brand.image,
        createdAt: brand.createdAt
    }));

    res.status(200).json({
        success: true,
        message: "تم جلب العلامات التجارية بنجاح ✅",
        count: formattedBrands.length,
        data: formattedBrands
    });
});



export const becomeSeller = asyncHandelr(async (req, res, next) => {
    const {
        fullName,
        email,
        phone,
        companyName,
        categories,
        password
    } = req.body;

    // نفس التحققات اللي عندك...
    if (!fullName || !password) {
        return next(new Error("الاسم الكامل وكلمة المرور مطلوبين", { cause: 400 }));
    }
    if (!email && !phone) {
        return next(new Error("يجب إدخال البريد الإلكتروني أو رقم الهاتف", { cause: 400 }));
    }
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
        return next(new Error("يجب اختيار قسم واحد على الأقل", { cause: 400 }));
    }

    // تحقق من عدم التكرار
    const existingVendor = await Usermodel.findOne({
        $or: [
            ...(email ? [{ email: email.toLowerCase() }] : []),
            ...(phone ? [{ phone }] : [])
        ]
    });

    if (existingVendor) {
        if (email && existingVendor.email === email.toLowerCase()) {
            return next(new Error("البريد الإلكتروني مستخدم من قبل", { cause: 400 }));
        }
        if (phone && existingVendor.phone === phone) {
            return next(new Error("رقم الهاتف مستخدم من قبل", { cause: 400 }));
        }
    }

    // تحقق من الأقسام
    const validCategories = await CategoryModellll.countDocuments({
        _id: { $in: categories },
        isActive: true
    });
    if (validCategories !== categories.length) {
        return next(new Error("واحد أو أكثر من الأقسام غير موجود أو غير مفعل", { cause: 400 }));
    }

    // تشفير الباسورد
    const hashedPassword = await generatehash({ planText: password });

    // إنشاء البائع (PENDING + isConfirmed = false)
    const vendor = await Usermodel.create({
        fullName,
        email: email?.toLowerCase(),
        phone,
        companyName,
        categories,
        password: hashedPassword,
        status: "PENDING",
        accountType: "vendor",
        isConfirmed: false
    });

    // توليد OTP وإرساله تلقائيًا
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
        `
    });

    return successresponse(res, "تم تقديم طلب الانضمام كبائع بنجاح ✅\nتم إرسال كود التفعيل إلى بريدك الإلكتروني", 201, {
        vendorId: vendor._id,
        status: "PENDING",
        isConfirmed: false,
        message: "يرجى تفعيل الحساب أولاً، ثم انتظار موافقة الإدارة"
    });
});



export const sendOtpforeach = asyncHandelr(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new Error("البريد الإلكتروني مطلوب", { cause: 400 }));
    }

    // البحث عن المستخدم بالإيميل
    const user = await Usermodel.findOne({
        email: email.toLowerCase()
    });

    if (!user) {
        return next(new Error("البريد الإلكتروني غير مسجل", { cause: 400 }));
    }

    // تحديد نوع الحساب
    const isVendor = user.accountType === "vendor";
    const isAdmin = user.accountType === "Admin";
    const isOwner = user.accountType === "Owner";

    if (!isVendor && !isAdmin && !isOwner) {
        return next(new Error("هذا الحساب غير مصرح له بتسجيل الدخول بهذه الطريقة", { cause: 403 }));
    }

    // للبائع فقط: يتحقق من الموافقة
    if (isVendor && user.status !== "ACCEPTED") {
        return next(new Error("طلب الانضمام كبائع لم يُقبل بعد، لا يمكن إرسال كود التحقق", { cause: 400 }));
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
        `
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
        return next(new Error("البريد الإلكتروني وكود التحقق مطلوبين", { cause: 400 }));
    }

    const vendor = await Usermodel.findOne({
        email: email.toLowerCase(),
        accountType: "vendor"
    });

    if (!vendor) {
        return next(new Error("البريد الإلكتروني غير مسجل كبائع", { cause: 400 }));
    }

    // التحقق من عدد المحاولات
    if (vendor.attemptCount >= 5 && vendor.blockUntil > Date.now()) {
        const minutesLeft = Math.ceil((vendor.blockUntil - Date.now()) / (60 * 1000));
        return next(new Error(`تم حظر الحساب مؤقتًا، حاول بعد ${minutesLeft} دقيقة`, { cause: 400 }));
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

    return successresponse(res, "تم تفعيل حساب البائع بنجاح ✅\nطلبك الآن في انتظار موافقة الإدارة", 200, {
        vendorId: vendor._id,
        isConfirmed: true,
        status: vendor.status
    });
});



export const getAllVendors = asyncHandelr(async (req, res, next) => {
    const {
        lang = "en",
        page = 1,
        limit = 10,
        status // optional: PENDING, ACCEPTED, REFUSED
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
            return next(new Error("حالة غير صحيحة، استخدم: PENDING, ACCEPTED, REFUSED", { cause: 400 }));
        }
        filter.status = status;
    }

    // عدد البائعين الكلي للـ pagination
    const totalVendors = await Usermodel.countDocuments(filter);

    // جلب البائعين مع pagination + populate للأقسام
    const vendors = await Usermodel.find(filter)
        .populate({
            path: "categories",
            match: { isActive: true },
            select: "name slug"
        })
        .select("fullName email phone companyName categories status createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean();

    if (vendors.length === 0) {
        return res.status(200).json({
            success: true,
            message: "لا يوجد بائعين حاليًا",
            count: 0,
            pagination: {
                currentPage: pageNum,
                totalPages: 0,
                totalItems: 0,
                itemsPerPage: limitNum,
                hasNext: false,
                hasPrev: false
            },
            data: []
        });
    }

    // تنسيق البيانات مع ترجمة أسماء الأقسام
    const formattedVendors = vendors.map(vendor => ({
        _id: vendor._id,
        fullName: vendor.fullName,
        email: vendor.email,
        phone: vendor.phone || null,
        companyName: vendor.companyName || null,
        status: vendor.status,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
        categories: (vendor.categories || []).map(cat => ({
            _id: cat._id,
            name: cat.name[lang] || cat.name.en,
            slug: cat.slug
        }))
    }));

    // معلومات الـ pagination
    const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(totalVendors / limitNum),
        totalItems: totalVendors,
        itemsPerPage: limitNum,
        hasNext: pageNum < Math.ceil(totalVendors / limitNum),
        hasPrev: pageNum > 1
    };

    res.status(200).json({
        success: true,
        message: "تم جلب البائعين بنجاح ✅",
        count: formattedVendors.length,
        pagination,
        data: formattedVendors
    });
});





export const updateVendorStatus = asyncHandelr(async (req, res, next) => {
    const { vendorId } = req.params;
    const { status } = req.body; // "ACCEPTED" أو "REFUSED"

    // التحقق من الحالة المرسلة
    if (!status || !["ACCEPTED", "REFUSED"].includes(status)) {
        return next(new Error("يجب إرسال حالة صحيحة: ACCEPTED أو REFUSED", { cause: 400 }));
    }

    // جلب البائع
    const vendor = await Usermodel.findOne({
        _id: vendorId,
        accountType: "vendor"
    });

    if (!vendor) {
        return next(new Error("البائع غير موجود", { cause: 404 }));
    }

    // لو الحالة بالفعل نفس اللي هيتغير ليها
    if (vendor.status === status) {
        return next(new Error(`حالة البائع بالفعل ${status === "ACCEPTED" ? "مقبول" : "مرفوض"}`, { cause: 400 }));
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
            html: htmlContent
        });
    } catch (error) {
        console.error("فشل إرسال الإيميل للبائع:", error);
        // مش هنرجع error عشان ما يفشلش العملية كلها، بس نسجل في اللوج
    }

    // رسالة نجاح للأدمن
    const action = status === "ACCEPTED" ? "قبول" : "رفض";
    return successresponse(res, `تم ${action} البائع بنجاح وإرسال إشعار له ✅`, 200, {
        vendorId: vendor._id,
        fullName: vendor.fullName,
        email: vendor.email,
        previousStatus: oldStatus,
        newStatus: status
    });
});

export const loginWithPassword = asyncHandelr(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new Error("البريد الإلكتروني وكلمة المرور مطلوبين", { cause: 400 }));
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
            return next(new Error("الحساب غير مفعل، يرجى تفعيله أولاً عبر كود OTP", { cause: 400 }));
        }
        if (user.status !== "ACCEPTED") {
            return next(new Error("طلب الانضمام لم يُقبل بعد", { cause: 400 }));
        }
    }

    // التحقق من الباسورد (التصحيح هنا)
    const isMatch = await comparehash({ planText: password, valuehash: user.password });// 👈 التعديل الوحيد

    if (!isMatch) {
        return next(new Error("بيانات الدخول غير صحيحة", { cause: 400 }));
    }

    // توليد التوكنات
    const access_Token = generatetoken({ payload: { id: user._id } });
    const refreshToken = generatetoken({
        payload: { id: user._id },
        expiresIn: "365d"
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
            status: user.status || null
        }
    });
});



