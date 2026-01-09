// services/flavor.service.js
import {asyncHandelr} from "../../../utlis/response/error.response.js";
import { PreferredFlavorModel } from '../../../DB/models/preferredFlavor.model.js';

export const createFlavor = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder, icon } = req.body;

  const flavor = await PreferredFlavorModel.create({
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
    createdBy: userId,
    updatedBy: userId
  });

  res.status(201).json({
    success: true,
    message: 'Flavor created successfully',
    data: flavor
  });
});

export const updateFlavor = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { id, nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder, icon } = req.body;

  const flavor = await PreferredFlavorModel.findById(id);
  if (!flavor) {
    return next(new Error('Flavor not found', { cause: 404 }));
  }

  const updates = {};
  if (nameAr !== undefined) updates['name.ar'] = nameAr;
  if (nameEn !== undefined) updates['name.en'] = nameEn;
  if (descriptionAr !== undefined) updates['description.ar'] = descriptionAr;
  if (descriptionEn !== undefined) updates['description.en'] = descriptionEn;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (icon !== undefined) updates.icon = icon;
  updates.updatedBy = userId;
  updates.updatedAt = new Date();

  const updatedFlavor = await PreferredFlavorModel.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Flavor updated successfully',
    data: updatedFlavor
  });
});

export const deleteFlavor = asyncHandelr(async (req, res, next) => {
  const { id } = req.body;

  const flavor = await PreferredFlavorModel.findById(id);
  if (!flavor) {
    return next(new Error('Flavor not found', { cause: 404 }));
  }

  // Check if flavor is being used anywhere before deleting
  // const isUsed = await checkIfFlavorIsUsed(id);
  // if (isUsed) {
  //   return next(new Error('Cannot delete flavor that is in use', { cause: 400 }));
  // }

  await PreferredFlavorModel.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Flavor deleted successfully'
  });
});

export const getFlavors = asyncHandelr(async (req, res, next) => {
  const { lang = 'en', page = 1, limit = 10, isActive, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (search) {
    filter[`name.${lang}`] = { $regex: search, $options: 'i' };
  }

  const [flavors, total] = await Promise.all([
    PreferredFlavorModel.find(filter)
      .select(`name.${lang} description.${lang} isActive icon sortOrder`)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    PreferredFlavorModel.countDocuments(filter)
  ]);

  // Transform data to flatten language structure
  const transformedFlavors = flavors.map(flavor => ({
    _id: flavor._id,
    name: flavor.name[lang],
    description: flavor.description[lang],
    isActive: flavor.isActive,
    icon: flavor.icon,
    sortOrder: flavor.sortOrder,
    createdAt: flavor.createdAt
  }));

  res.status(200).json({
    success: true,
    data: transformedFlavors,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const getFlavorById = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  const { lang = 'en' } = req.query;

  const flavor = await PreferredFlavorModel.findById(id).lean();
  if (!flavor) {
    return next(new Error('Flavor not found', { cause: 404 }));
  }

  const transformedFlavor = {
    _id: flavor._id,
    name: flavor.name[lang],
    description: flavor.description[lang],
    isActive: flavor.isActive,
    icon: flavor.icon,
    sortOrder: flavor.sortOrder,
    createdAt: flavor.createdAt
  };

  res.status(200).json({
    success: true,
    data: transformedFlavor
  });
});