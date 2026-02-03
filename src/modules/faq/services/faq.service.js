import { FaqModel } from "../../../DB/models/faqModel.js";
import {
  create,
  findAll,
  findById,
  findByIdAndDelete,
  countDocuments,
} from "../../../DB/dbservice.js";
import { throwError } from "../helpers/responseMessages.js";

export const formatFaqForLanguage = (faq, lang) => {
  if (!faq) return null;

  const obj = faq.toObject ? faq.toObject() : { ...faq };

  obj.question = faq.question?.[lang] || faq.question?.en || "";
  obj.answer = faq.answer?.[lang] || faq.answer?.en || "";

  return obj;
};

export const formatFaqsForLanguage = (faqs, lang) => {
  return faqs.map((faq) => formatFaqForLanguage(faq, lang));
};

export const createFaq = async (req, lang) => {
  const user = req.user;

  const { question, answer, category } = req.body;

  if (!question?.ar || !question?.en) {
    throwError("question_required", lang, {}, 400);
  }

  if (!answer?.ar || !answer?.en) {
    throwError("answer_required", lang, {}, 400);
  }

  return create({
    model: FaqModel,
    data: {
      question,
      answer,
      category,
      createdBy: user._id,
    },
  });

};

export const deleteFaq = async (req, lang) => {
  const { faqId } = req.body;

  const faq = await findById({
    model: FaqModel,
    id: faqId,
  });

  if (!faq) {
    throwError("not_found", lang, {}, 404);
  }

  await findByIdAndDelete({
    model: FaqModel,
    id: faqId,
  });
};

export const getFaqsByCategory = async (req, lang) => {
  const { category, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const faqs = await findAll({
    model: FaqModel,
    filter: { category },
    select: "question answer category createdAt",
    sort: { createdAt: -1 },
    skip,
    limit: parseInt(limit),
  });

  const total = await countDocuments({
    model: FaqModel,
    filter: { category },
  });

  const formattedFaqs = formatFaqsForLanguage(faqs, lang);

  return {
    faqs: formattedFaqs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};