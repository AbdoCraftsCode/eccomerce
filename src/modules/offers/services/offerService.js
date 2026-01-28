import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { OfferModel } from "../../../DB/models/offerModel.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { VariantModel } from "../../../DB/models/variantSchema.js";
import { v2 as cloudinary } from "cloudinary";

const uploadImagesToCloudinary = async (files) => {
  if (!files?.images) return [];

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
  if (!images.length) return;

  const deletePromises = images.map(async (image) => {
    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id, {
        resource_type: "image",
      });
    }
  });

  await Promise.all(deletePromises);
};

export const createOffer = asyncHandelr(async (req, res, next) => {
  const user = req.user;

  if (user.accountType !== "vendor") {
    return next(new Error("Only vendors can create offers", { cause: 403 }));
  }

  const {
    nameAr,
    nameEn,
    descriptionAr,
    descriptionEn,
    products,
    originalPrice,
    offerPrice,
    currency,
    startDate,
    endDate,
  } = req.body;

  const productIds = products.map((item) => item.productId);

  const vendorProducts = await ProductModellll.find({
    _id: { $in: productIds },
    createdBy: user._id,
  });

  if (vendorProducts.length !== productIds.length) {
    return next(
      new Error("Some products do not belong to you or do not exist", {
        cause: 403,
      }),
    );
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
      return next(
        new Error(
          "Some variants do not belong to your products or do not exist",
          { cause: 403 },
        ),
      );
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

  res.status(201).json({
    success: true,
    message: "Offer created successfully",
    data: offer,
  });
});

export const updateOffer = asyncHandelr(async (req, res, next) => {
  const user = req.user;
  const { offerId } = req.params;
  const updateData = req.body;

  if (user.accountType !== "vendor") {
    return next(new Error("Only vendors can update offers", { cause: 403 }));
  }

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    return next(new Error("Offer not found", { cause: 404 }));
  }

  if (offer.createdBy.toString() !== user._id.toString()) {
    return next(
      new Error("You can only update your own offers", { cause: 403 }),
    );
  }

  if (offer.status === "active" || offer.status === "expired") {
    return next(
      new Error(`Cannot update offer with ${offer.status} status`, {
        cause: 400,
      }),
    );
  }

  if (updateData.products) {
    const productIds = updateData.products.map((item) => item.productId);

    const vendorProducts = await ProductModellll.find({
      _id: { $in: productIds },
      createdBy: user._id,
    });

    if (vendorProducts.length !== productIds.length) {
      return next(
        new Error("Some products do not belong to you or do not exist", {
          cause: 403,
        }),
      );
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
        return next(
          new Error(
            "Some variants do not belong to your products or do not exist",
            { cause: 403 },
          ),
        );
      }
    }
  }

  if (updateData.nameAr || updateData.nameEn) {
    if (!updateData.nameAr || !updateData.nameEn) {
      return next(
        new Error("Both Arabic and English names must be provided", {
          cause: 400,
        }),
      );
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

  res.status(200).json({
    success: true,
    message: "Offer updated successfully",
    data: updatedOffer,
  });
});

export const approveOffer = asyncHandelr(async (req, res, next) => {
  const user = req.user;
  const { offerId, status } = req.body;

  if (user.accountType !== "Admin") {
    return next(new Error("Only admin can approve offers", { cause: 403 }));
  }

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    return next(new Error("Offer not found", { cause: 404 }));
  }

  if (offer.status !== "pending") {
    return next(new Error(`Offer is already ${offer.status}`, { cause: 400 }));
  }

  offer.status = status;
  offer.approvedBy = user._id;
  await offer.save();

  res.status(200).json({
    success: true,
    message: `Offer ${status} successfully`,
    data: offer,
  });
});

export const getOffers = asyncHandelr(async (req, res, next) => {
  const { status, page = 1, limit = 10, vendorId } = req.query;

  const skip = (page - 1) * limit;
  const filter = {};

  if (status) filter.status = status;
  if (vendorId) filter.createdBy = vendorId;

  const currentDate = new Date();
  const offers = await OfferModel.find(filter)
    .populate("createdBy", "fullName email phone")
    .populate({
      path: "products.productId",
      select: "name images mainPrice",
    })
    .populate({
      path: "products.variantId",
      select: "price sku images",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const updatedOffers = offers.map((offer) => {
    if (offer.status === "active" && offer.endDate < currentDate) {
      offer.status = "expired";
      offer.save();
    }
    return offer;
  });

  const total = await OfferModel.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      offers: updatedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const deleteOffer = asyncHandelr(async (req, res, next) => {
  const user = req.user;
  const { offerId } = req.params;

  if (user.accountType !== "vendor") {
    return next(new Error("Only vendors can delete offers", { cause: 403 }));
  }

  const offer = await OfferModel.findById(offerId);

  if (!offer) {
    return next(new Error("Offer not found", { cause: 404 }));
  }

  if (offer.createdBy.toString() !== user._id.toString()) {
    return next(
      new Error("You can only delete your own offers", { cause: 403 }),
    );
  }

  if (offer.status === "active") {
    return next(new Error("Cannot delete active offer", { cause: 400 }));
  }

  if (offer.images && offer.images.length > 0) {
    await deleteImagesFromCloudinary(offer.images);
  }

  await OfferModel.findByIdAndDelete(offerId);

  res.status(200).json({
    success: true,
    message: "Offer deleted successfully",
  });
});

export const getMyOffers = asyncHandelr(async (req, res, next) => {
  const user = req.user;
  const { status, page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;
  const filter = { createdBy: user._id };

  if (status) filter.status = status;

  const currentDate = new Date();
  const offers = await OfferModel.find(filter)
    .populate({
      path: "products.productId",
      select: "name images mainPrice",
    })
    .populate({
      path: "products.variantId",
      select: "price sku images",
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const updatedOffers = offers.map((offer) => {
    if (offer.status === "active" && offer.endDate < currentDate) {
      offer.status = "expired";
      offer.save();
    }
    return offer;
  });

  const total = await OfferModel.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      offers: updatedOffers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});
