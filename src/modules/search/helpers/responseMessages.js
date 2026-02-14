export const getResponseMessage = (key, lang = "en") => {
  const messages = {
    en: {
      search_completed: "Search completed successfully",
      no_results_found: "No results found for your search",
    },
    ar: {
      search_completed: "تم البحث بنجاح",
      no_results_found: "لا توجد نتائج للبحث",
    },
  };

  return messages[lang][key] || messages.en[key];
};

export const getSearchErrorMessage = (key, lang = "en", params = {}) => {
  const messages = {
    en: {
      search_failed: "Search failed. Please try again.",
      invalid_search_query: "Invalid search query. Please provide a valid search term.",
      unauthorized_search: "You are not authorized to perform this search.",
      search_term_required: "Search term is required",
    },
    ar: {
      search_failed: "فشل البحث. يرجى المحاولة مرة أخرى.",
      invalid_search_query: "استعلام بحث غير صالح. يرجى تقديم مصطلح بحث صالح.",
      unauthorized_search: "غير مصرح لك بإجراء هذا البحث.",
      search_term_required: "مصطلح البحث مطلوب",
    },
  };

  let message = messages[lang]?.[key] || messages.en[key] || "Unexpected error";

  Object.keys(params).forEach((p) => {
    message = message.replace(`{${p}}`, params[p]);
  });

  return message;
};

export const throwError = (key, lang, params = {}, status = 400) => {
  const error = new Error(getSearchErrorMessage(key, lang, params));
  error.status = status;
  throw error;
};
