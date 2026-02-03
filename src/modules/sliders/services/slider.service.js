import Slider from "../../../DB/models/Slider.model.js";
import { ProductModellll } from "../../../DB/models/productSchemaaaa.js";
import { OfferModel } from "../../../DB/models/offerModel.js";
import { BrandModel } from "../../../DB/models/brandSchemaaa.js";
import { CategoryModellll } from "../../../DB/models/categorySchemaaa.js";
import { v2 as cloudinary } from "cloudinary";
import {
  create,
  findAll,
  findById,
  findOne,
  findByIdAndUpdate,
  findByIdAndDelete,
  countDocuments,
} from "../../../DB/dbservice.js";
import { throwError } from "../helpers/responseMessages.js";

const uploadImageToCloudinary = async (file) => {
  if (!file) {
    throw new Error("Image file is required");
  }

  const uploaded = await cloudinary.uploader.upload(file.path, {
    folder: "sliders",
    resource_type: "image",
    transformation: [
      { width: 1200, height: 600, crop: "fill" },
      { quality: "auto" },
    ],
  });

  return {
    url: uploaded.secure_url,
    public_id: uploaded.public_id,
  };
};

const deleteImageFromCloudinary = async (public_id) => {
  if (public_id) {
    await cloudinary.uploader.destroy(public_id, { resource_type: "image" });
  }
};

const validateReferenceId = async (type, referenceId, lang) => {
  if (type === "default") return null;

  let model;
  switch (type) {
    case "product":
      model = ProductModellll;
      break;
    case "offer":
      model = OfferModel;
      break;
    case "brand":
      model = BrandModel;
      break;
    case "category":
      model = CategoryModellll;
      break;
    default:
      throwError("invalid_type", lang, {}, 400);
  }

  const refDoc = await findById({
    model,
    id: referenceId,
  });

  if (!refDoc) {
    throwError("invalid_ref", lang, {}, 404);
  }

  return referenceId;
};

export const createSlider = async (req, lang) => {
  const user = req.user;
  const { type, referenceId } = req.body;

  const validRefId = await validateReferenceId(type, referenceId, lang);

  const existingSlider = await findOne({
    model: Slider,
    filter: { type, referenceId: validRefId },
  });

  if (existingSlider) {
    throwError("duplicate_slider", lang, {}, 400);
  }

  const image = await uploadImageToCloudinary(req.file);

  return create({
    model: Slider,
    data: {
      image,
      type,
      referenceId: validRefId,
      createdBy: user._id,
    },
  });
};

export const updateSlider = async (req, lang) => {
  const user = req.user;
  const { sliderId } = req.params;
  const { type, referenceId } = req.body;

  const slider = await findById({
    model: Slider,
    id: sliderId,
  });

  if (!slider) {
    throwError("not_found", lang, {}, 404);
  }

  const updateType = type || slider.type;
  const updateRefId =
    referenceId !== undefined ? referenceId : slider.referenceId;

  const validRefId = await validateReferenceId(updateType, updateRefId, lang);

  const existingSlider = await findOne({
    model: Slider,
    filter: {
      type: updateType,
      referenceId: validRefId,
      _id: { $ne: sliderId },
    },
  });

  if (existingSlider) {
    throwError("duplicate_slider", lang, {}, 400);
  }

  const updateData = {
    type: updateType,
    referenceId: validRefId,
  };

  if (req.file) {
    await deleteImageFromCloudinary(slider.image.public_id);
    const newImage = await uploadImageToCloudinary(req.file);
    updateData.image = newImage;
  }

  return findByIdAndUpdate({
    model: Slider,
    id: sliderId,
    data: updateData,
    options: { new: true },
  });
};

export const deleteSlider = async (req, lang) => {
  const { sliderId } = req.params;

  const slider = await findByIdAndDelete({
    model: Slider,
    id: sliderId,
  });

  if (!slider) {
    throwError("not_found", lang, {}, 404);
  }

  await deleteImageFromCloudinary(slider.image.public_id);
};

export const getSliders = async (req, lang) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const sliders = await findAll({
    model: Slider,
    filter: { isActive: true },
    skip,
    limit: parseInt(limit),
  });

  const total = await countDocuments({
    model: Slider,
    filter: { isActive: true },
  });

  return {
    sliders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};
