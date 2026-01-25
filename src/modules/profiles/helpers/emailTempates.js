export const emailTemplates = {
  emailVerification: (emailOTP, lang = 'en', name = '') => {
    const templates = {
      en: {
        subject: "Email Verification Code - kocart",
        text: `Hello${name ? ' ' + name : ''},\n\nYour email verification code is: ${emailOTP}\nValid for 10 minutes.\n\nBest regards,\nPlatform Team`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 30px; background: #f9f9f9; border-radius: 10px;">
            <h2>Hello${name ? ' ' + name : ''} 👋</h2>
            <p>Your email verification code is:</p>
            <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${emailOTP}</p>
            <p>This code is valid for <strong>10 minutes</strong>.</p>
            <p style="color: #999; font-size: 14px;">Do not share this code with anyone.</p>
          </div>
        `
      },
      ar: {
        subject: "كود تفعيل البريد الإلكتروني - كوكارت",
        text: `مرحبًا${name ? ' ' + name : ''}،\n\nكود تفعيل بريدك الإلكتروني هو: ${emailOTP}\nصالح لمدة 10 دقائق.\n\nتحياتنا،\nفريق المنصة`,
        html: `
          <div style="font-family: Arial, sans-serif; text-align: right; direction: rtl; padding: 30px; background: #f9f9f9; border-radius: 10px;">
            <h2>مرحبًا${name ? ' ' + name : ''} 👋</h2>
            <p>كود تفعيل بريدك الإلكتروني هو:</p>
            <p style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px;">${emailOTP}</p>
            <p>هذا الكود صالح لمدة <strong>10 دقائق</strong>.</p>
            <p style="color: #999; font-size: 14px;">لا تشارك هذا الكود مع أحد.</p>
          </div>
        `
      }
    };
    
    return templates[lang] || templates.en;
  },
  
};