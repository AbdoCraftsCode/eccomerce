import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { FaqModel } from "../../../DB/models/faqModel.js";

export const createFaq = asyncHandelr(async (req, res, next) => {
  const { question, answer, category } = req.body;
  const user = req.user;

  if (user.accountType !== "Admin") {
    return next(new Error("Only admin can create FAQ", { cause: 403 }));
  }

  const faq = await FaqModel.create({
    question,
    answer,
    category,
    createdBy: user._id,
  });

  res.status(201).json({
    success: true,
    message: "FAQ created successfully",
    data: faq,
  });
});

export const deleteFaq = asyncHandelr(async (req, res, next) => {
  const { faqId } = req.body;
  const user = req.user;

  if (user.accountType !== "Admin") {
    return next(new Error("Only admin can delete FAQ", { cause: 403 }));
  }

  const faq = await FaqModel.findById(faqId);

  if (!faq) {
    return next(new Error("FAQ not found", { cause: 404 }));
  }

  await FaqModel.findByIdAndDelete(faqId);

  res.status(200).json({
    success: true,
    message: "FAQ deleted successfully",
  });
});

export const getFaqsByCategory = asyncHandelr(async (req, res, next) => {
  const { category, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  const faqs = await FaqModel.find({ category })
    .select("question answer category createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await FaqModel.countDocuments({ category });

  res.status(200).json({
    success: true,
    data: {
      faqs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});
