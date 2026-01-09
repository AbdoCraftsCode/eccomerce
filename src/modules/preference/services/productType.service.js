// services/productType.service.js
import {asyncHandelr} from "../../../utlis/response/error.response.js";
import { PreferredProductTypeModel } from '../../../DB/models/preferredProductType.model.js';

export const createProductType = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder, icon, category } = req.body;

  const productType = await PreferredProductTypeModel.create({
    name: {
      ar: nameAr,
      en: nameEn
    },
    description: {
      ar: descriptionAr || '',
      en: descriptionEn || ''
    },
    isActive: isActive !== undefined ? isActive : true,
    sortOrder: sortOrder || 0,
    icon: icon || '',
    category: category || 'other',
    createdBy: userId,
    updatedBy: userId
  });

  res.status(201).json({
    success: true,
    message: 'Product type created successfully',
    data: productType
  });
});

export const updateProductType = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { id, nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder, icon, category } = req.body;

  const productType = await PreferredProductTypeModel.findById(id);
  if (!productType) {
    return next(new Error('Product type not found', { cause: 404 }));
  }

  const updates = {};
  if (nameAr !== undefined) updates['name.ar'] = nameAr;
  if (nameEn !== undefined) updates['name.en'] = nameEn;
  if (descriptionAr !== undefined) updates['description.ar'] = descriptionAr;
  if (descriptionEn !== undefined) updates['description.en'] = descriptionEn;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (icon !== undefined) updates.icon = icon;
  if (category !== undefined) updates.category = category;
  updates.updatedBy = userId;
  updates.updatedAt = new Date();

  const updatedProductType = await PreferredProductTypeModel.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Product type updated successfully',
    data: updatedProductType
  });
});

export const deleteProductType = asyncHandelr(async (req, res, next) => {
  const { id } = req.body;

  const productType = await PreferredProductTypeModel.findById(id);
  if (!productType) {
    return next(new Error('Product type not found', { cause: 404 }));
  }

  await PreferredProductTypeModel.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Product type deleted successfully'
  });
});

export const getProductTypes = asyncHandelr(async (req, res, next) => {
  const { lang = 'en', page = 1, limit = 10, isActive, search, category } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (category) {
    filter.category = category;
  }
  
  if (search) {
    filter[`name.${lang}`] = { $regex: search, $options: 'i' };
  }

  const [productTypes, total] = await Promise.all([
    PreferredProductTypeModel.find(filter)
      .select(`name.${lang} description.${lang} isActive icon category sortOrder`)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PreferredProductTypeModel.countDocuments(filter)
  ]);

  const transformedProductTypes = productTypes.map(productType => ({
    _id: productType._id,
    name: productType.name[lang],
    description: productType.description[lang],
    isActive: productType.isActive,
    icon: productType.icon,
    category: productType.category,
    sortOrder: productType.sortOrder,
    createdAt: productType.createdAt
  }));

  res.status(200).json({
    success: true,
    data: transformedProductTypes,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const getProductTypeById = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  const { lang = 'en' } = req.query;

  const productType = await PreferredProductTypeModel.findById(id).lean();
  if (!productType) {
    return next(new Error('Product type not found', { cause: 404 }));
  }

  const transformedProductType = {
    _id: productType._id,
    name: productType.name[lang],
    description: productType.description[lang],
    isActive: productType.isActive,
    icon: productType.icon,
    category: productType.category,
    sortOrder: productType.sortOrder,
    createdAt: productType.createdAt
  };

  res.status(200).json({
    success: true,
    data: transformedProductType
  });
});