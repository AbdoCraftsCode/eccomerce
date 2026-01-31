export const getUserLanguage = (req) => {
  if (req.user?.lang === "ar") return "ar";
  if (req.headers["accept-language"]?.includes("ar")) return "ar";
  return "en";
};