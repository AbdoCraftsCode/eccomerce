import { OfferModel } from "../../../DB/models/offerModel.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { v2 as cloudinary } from "cloudinary";
import { throwError } from "../helpers/responseMessages.js";
import { formatCurrencyForLanguage } from "../../currency/services/currency.service.js"; // Import from currency service


const uploadImagesToCloudinary = async (files) => {
  if (!files?.images?.length) return [];

  const uploadPromises = files.images.map(async (file) => {
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: "offers",
      resource_type: "image",
      transformation: [
        { width: 800, height: 600, crop: "fill" },
        { quality: "auto" },
      ],
    });

    return {
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
    };
  });

  return Promise.all(uploadPromises);
};

const deleteImagesFromCloudinary = async (images) => {
  if (!images?.length) return;

  const deletePromises = images.map(async (image) => {
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id, {
        resource_type: "image",
      });
    }
  });

  await Promise.all(deletePromises);
};

export const formatOfferForLanguage = (offer, lang) => {
  if (!offer) return null;

  const obj = offer.toObject ? offer.toObject() : { ...offer };

  obj.nameDisplay = offer.name?.[lang] || offer.name?.en || "Unnamed Offer";
  obj.descriptionDisplay =
    offer.description?.[lang] || offer.description?.en || "";

  if (obj.currency) {
    obj.currency = formatCurrencyForLanguage(obj.currency, lang);
  }
  return obj;
};

export const formatOffersForLanguage = (offers, lang) => {
  return offers.map((offer) => formatOfferForLanguage(offer, lang));
};

export const createOffer = async (req, lang) => {
  const user = req.user;

  const currency = user.currency;

  if (!currency) {
    throwError("vendor_no_currency", lang, {}, 400);
  }

  const {
    nameAr,
    nameEn,
    descriptionAr,
    descriptionEn,
    products,
    originalPrice,
    offerPrice,
    startDate,
    endDate,
  } = req.body;

  const productIds = products.map((item) => item.productId);

  const vendorProducts = await ProductModellll.find({
    _id: { $in: productIds },
    createdBy: user._id,
  });

  if (vendorProducts.length !== productIds.length) {
    throwError("products_not_owned", lang, {}, 403);
  }

  const variantIds = products
    .filter((item) => item.variantId)
    .map((item) => item.variantId);

  if (variantIds.length > 0) {
    const vendorVariants = await VariantModel.find({
      _id: { $in: variantIds },
      productId: { $in: productIds },
    });

    if (vendorVariants.length !== variantIds.length) {
      throwError("variants_not_owned", lang, {}, 403);
    }
  }

  const images = await uploadImagesToCloudinary(req.files);

  const offer = await OfferModel.create({
    name: { ar: nameAr, en: nameEn },
    description: { ar: descriptionAr, en: descriptionEn },
    images,
    products,
    originalPrice,
    offerPrice,
    currency,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    createdBy: user._id,
  });

  const populatedOffer = await offer.populate({
    path: "currency",
    select: "name.ar name.en code symbol",
  });

  const formattedOffer = formatOfferForLanguage(populatedOffer, lang);
  formattedOffer.products = undefined;

  return formattedOffer;
};

export const updateOffer = async (req, lang) => {
  const user = req.user;
  const { offerId } = req.params;
  const updateData = req.body;

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    throwError("offer_not_found", lang, {}, 404);
  }

  if (offer.createdBy.toString() !== user._id.toString()) {
    throwError("not_your_offer", lang, {}, 403);
  }

  if (offer.status === "active" || offer.status === "expired") {
    throwError("cannot_update_status", lang, { status: offer.status }, 400);
  }

  if (updateData.products) {
    const productIds = updateData.products.map((item) => item.productId);

    const vendorProducts = await ProductModellll.find({
      _id: { $in: productIds },
      createdBy: user._id,
    });

    if (vendorProducts.length !== productIds.length) {
      throwError("products_not_owned", lang, {}, 403);
    }

    const variantIds = updateData.products
      .filter((item) => item.variantId)
      .map((item) => item.variantId);

    if (variantIds.length > 0) {
      const vendorVariants = await VariantModel.find({
        _id: { $in: variantIds },
        productId: { $in: productIds },
      });

      if (vendorVariants.length !== variantIds.length) {
        throwError("variants_not_owned", lang, {}, 403);
      }
    }
  }

  if (updateData.nameAr || updateData.nameEn) {
    if (!updateData.nameAr || !updateData.nameEn) {
      throwError("both_names_required", lang, {}, 400);
    }
  }

  if (updateData.startDate && !updateData.endDate) {
    updateData.endDate = offer.endDate;
  }

  if (updateData.endDate && !updateData.startDate) {
    updateData.startDate = offer.startDate;
  }

  if (req.files?.images && req.files.images.length > 0) {
    if (offer.images && offer.images.length > 0) {
      await deleteImagesFromCloudinary(offer.images);
    }

    const newImages = await uploadImagesToCloudinary(req.files);
    updateData.images = newImages;
  }

  if (updateData.nameAr || updateData.nameEn) {
    updateData.name = {
      ar: updateData.nameAr || offer.name.ar,
      en: updateData.nameEn || offer.name.en,
    };
    delete updateData.nameAr;
    delete updateData.nameEn;
  }

  if (updateData.descriptionAr || updateData.descriptionEn) {
    updateData.description = {
      ar: updateData.descriptionAr || offer.description.ar,
      en: updateData.descriptionEn || offer.description.en,
    };
    delete updateData.descriptionAr;
    delete updateData.descriptionEn;
  }

  delete updateData.status;

  const updatedOffer = await OfferModel.findByIdAndUpdate(
    offerId,
    { $set: updateData },
    { new: true, runValidators: true },
  );

  const populatedOffer = await updatedOffer.populate({
    path: "currency",
    select: "name.ar name.en code symbol",
  });

  const formattedOffer = formatOfferForLanguage(populatedOffer, lang);
  formattedOffer.products = undefined;

  return formattedOffer;
};

export const getOfferById = async (req, lang) => {
  const { offerId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const offer = await OfferModel.findById(offerId)
    .populate("createdBy", "fullName email phone")
    .populate({
      path: "currency",
      select: "name.ar name.en code symbol",
    });

  if (!offer) {
    throwError("offer_not_found", lang, {}, 404);
  }

  const skip = (page - 1) * limit;
  const paginatedProducts = offer.products.slice(skip, skip + parseInt(limit));

  const populatedProducts = await Promise.all(
    paginatedProducts.map(async (item) => {
      const product = await ProductModellll.findById(item.productId).select(
        "name description images",
      );

      let variant = null;
      if (item.variantId) {
        variant = await VariantModel.findById(item.variantId)
          .select("images attributes")
          .populate({
            path: "attributes.attributeId",
            model: "Attributee", // match your model name
            select: "name.ar name.en type isActive",
          })
          .populate({
            path: "attributes.valueId",
            model: "AttributeValue", // match your model name
            select: "value.ar value.en hexCode isActive",
          });
      }

      return {
        product: product,
        variant: variant,
      };
    }),
  );

  const offerObj = formatOfferForLanguage(offer, lang);
  offerObj.products = populatedProducts;
  offerObj.pagination = {
    page: parseInt(page),
    limit: parseInt(limit),
    totalProducts: offer.products.length,
    totalPages: Math.ceil(offer.products.length / limit),
  };

  return offerObj;
};

export const approveOffer = async (req, lang) => {
  const user = req.user;
  const { offerId, status } = req.body;

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    throwError("offer_not_found", lang, {}, 404);
  }

  if (offer.status !== "pending") {
    throwError("offer_already_processed", lang, { status: offer.status }, 400);
  }

  offer.status = status;
  offer.approvedBy = user._id;
  await offer.save();


  const populatedOffer = await offer.populate({
    path: "currency",
    select: "name.ar name.en code symbol",
  });

  const formattedOffer = formatOfferForLanguage(populatedOffer, lang);

  formattedOffer.products = undefined;

  return formattedOffer;
};

export const getOffers = async (req, lang) => {
  const { status, page = 1, limit = 10, vendorId } = req.query;

  const skip = (page - 1) * limit;
  const filter = {};

  if (status) filter.status = status;
  if (vendorId) filter.createdBy = vendorId;

  const currentDate = new Date();
  let offers = await OfferModel.find(filter)
    .populate("createdBy", "fullName email phone")
    .populate({
      path: "currency",
      select: "name.ar name.en code symbol",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  offers = await Promise.all(
    offers.map(async (offer) => {
      if (offer.status === "active" && offer.endDate < currentDate) {
        offer.status = "expired";
        await offer.save();
      }
      return offer;
    }),
  );

  const total = await OfferModel.countDocuments(filter);

  const formattedOffers = formatOffersForLanguage(offers, lang);

  // Remove products from each offer
  formattedOffers.forEach((offer) => {
    offer.products = undefined;
  });

  return {
    offers: formattedOffers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const deleteOffer = async (req, lang) => {
  const user = req.user;
  const { offerId } = req.params;

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    throwError("offer_not_found", lang, {}, 404);
  }

  if (offer.createdBy.toString() !== user._id.toString()) {
    throwError("not_your_offer", lang, {}, 403);
  }

  if (offer.status === "active") {
    throwError("cannot_delete_active", lang, {}, 400);
  }

  if (offer.images && offer.images.length > 0) {
    await deleteImagesFromCloudinary(offer.images);
  }

  await OfferModel.findByIdAndDelete(offerId);
};

export const getMyOffers = async (req, lang) => {
  const user = req.user;
  const { status, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;
  const filter = { createdBy: user._id };

  if (status) filter.status = status;

  const currentDate = new Date();
  let offers = await OfferModel.find(filter)
    .populate({
      path: "currency",
      select: "name.ar name.en code symbol",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  offers = await Promise.all(
    offers.map(async (offer) => {
      if (offer.status === "active" && offer.endDate < currentDate) {
        offer.status = "expired";
        await offer.save();
      }
      return offer;
    }),
  );

  const total = await OfferModel.countDocuments(filter);

  const formattedOffers = formatOffersForLanguage(offers, lang);

  formattedOffers.forEach((offer) => {
    offer.products = undefined;
  });

  return {
    offers: formattedOffers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};