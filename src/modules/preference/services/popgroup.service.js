// services/popgroup.service.js
import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { FavoritePopgroupModel } from '../../../DB/models/favoritePopgroup.model.js';
import { v2 as cloudinary } from 'cloudinary';

// Helper function to upload image to Cloudinary
const uploadImageToCloudinary = async (file) => {
  try {
    if (!file) return null;
    
    const uploaded = await cloudinary.uploader.upload(file.path, {
      folder: 'popgroups',
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill' }, // Square image
        { quality: 'auto' }
      ]
    });
    
    return {
      url: uploaded.secure_url,
      public_id: uploaded.public_id
    };
  } catch (error) {
    console.error('Error uploading popgroup image:', error);
    throw new Error('Failed to upload image');
  }
};

// Helper function to delete image from Cloudinary
const deleteImageFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;
    
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image'
    });
    console.log(`Deleted image from Cloudinary: ${publicId}`);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    // Don't throw error to prevent operation from failing
  }
};

export const createPopgroup = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder } = req.body;

  // Upload image if provided
  let imageData = {};
  if (req.files?.image && req.files.image[0]) {
    imageData = await uploadImageToCloudinary(req.files.image[0]);
  }

  const popgroup = await FavoritePopgroupModel.create({
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
    image: imageData,
    createdBy: userId,
    updatedBy: userId
  });

  res.status(201).json({
    success: true,
    message: 'Popgroup created successfully',
    data: popgroup
  });
});

export const updatePopgroup = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { id, nameAr, nameEn, descriptionAr, descriptionEn, isActive, sortOrder } = req.body;

  const popgroup = await FavoritePopgroupModel.findById(id);
  if (!popgroup) {
    return next(new Error('Popgroup not found', { cause: 404 }));
  }

  const updates = {};
  if (nameAr !== undefined) updates['name.ar'] = nameAr;
  if (nameEn !== undefined) updates['name.en'] = nameEn;
  if (descriptionAr !== undefined) updates['description.ar'] = descriptionAr;
  if (descriptionEn !== undefined) updates['description.en'] = descriptionEn;
  if (isActive !== undefined) updates.isActive = isActive;
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  
  // Handle image update
  let oldImagePublicId = null;
  if (req.files?.image && req.files.image[0]) {
    // Store old image public_id for deletion
    if (popgroup.image && popgroup.image.public_id) {
      oldImagePublicId = popgroup.image.public_id;
    }
    
    // Upload new image
    const newImage = await uploadImageToCloudinary(req.files.image[0]);
    updates.image = newImage;
  }
  
  updates.updatedBy = userId;
  updates.updatedAt = new Date();

  const updatedPopgroup = await FavoritePopgroupModel.findByIdAndUpdate(
    id,
    updates,
    { new: true, runValidators: true }
  );

  // Delete old image from Cloudinary after successful update
  if (oldImagePublicId) {
    await deleteImageFromCloudinary(oldImagePublicId);
  }

  res.status(200).json({
    success: true,
    message: 'Popgroup updated successfully',
    data: updatedPopgroup
  });
});

export const deletePopgroup = asyncHandelr(async (req, res, next) => {
  const { id } = req.body;

  const popgroup = await FavoritePopgroupModel.findById(id);
  if (!popgroup) {
    return next(new Error('Popgroup not found', { cause: 404 }));
  }

  // Delete image from Cloudinary if exists
  if (popgroup.image && popgroup.image.public_id) {
    await deleteImageFromCloudinary(popgroup.image.public_id);
  }

  await FavoritePopgroupModel.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Popgroup deleted successfully'
  });
});

export const getPopgroups = asyncHandelr(async (req, res, next) => {
  const { lang = 'en', page = 1, limit = 10, isActive, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filter = {};
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  
  if (search) {
    filter[`name.${lang}`] = { $regex: search, $options: 'i' };
  }

  const [popgroups, total] = await Promise.all([
    FavoritePopgroupModel.find(filter)
      .select(`name.${lang} description.${lang} isActive image sortOrder`)
      .sort({ sortOrder: 1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    FavoritePopgroupModel.countDocuments(filter)
  ]);

  const transformedPopgroups = popgroups.map(popgroup => ({
    _id: popgroup._id,
    name: popgroup.name[lang],
    description: popgroup.description[lang],
    isActive: popgroup.isActive,
    image: popgroup.image,
    sortOrder: popgroup.sortOrder,
    createdAt: popgroup.createdAt
  }));

  res.status(200).json({
    success: true,
    data: transformedPopgroups,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

export const getPopgroupById = asyncHandelr(async (req, res, next) => {
  const { id } = req.params;
  const { lang = 'en' } = req.query;

  const popgroup = await FavoritePopgroupModel.findById(id).lean();
  if (!popgroup) {
    return next(new Error('Popgroup not found', { cause: 404 }));
  }

  const transformedPopgroup = {
    _id: popgroup._id,
    name: popgroup.name[lang],
    description: popgroup.description[lang],
    isActive: popgroup.isActive,
    image: popgroup.image,
    sortOrder: popgroup.sortOrder,
    createdAt: popgroup.createdAt
  };

  res.status(200).json({
    success: true,
    data: transformedPopgroup
  });
});

// New endpoint to update only image
export const updatePopgroupImage = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.body;

  const popgroup = await FavoritePopgroupModel.findById(id);
  if (!popgroup) {
    return next(new Error('Popgroup not found', { cause: 404 }));
  }

  if (!req.files?.image || !req.files.image[0]) {
    return next(new Error('No image provided', { cause: 400 }));
  }

  // Delete old image if exists
  if (popgroup.image && popgroup.image.public_id) {
    await deleteImageFromCloudinary(popgroup.image.public_id);
  }

  // Upload new image
  const newImage = await uploadImageToCloudinary(req.files.image[0]);

  const updatedPopgroup = await FavoritePopgroupModel.findByIdAndUpdate(
    id,
    {
      image: newImage,
      updatedBy: userId,
      updatedAt: new Date()
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Popgroup image updated successfully',
    data: updatedPopgroup
  });
});

// New endpoint to remove image only
export const removePopgroupImage = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { id } = req.body;

  const popgroup = await FavoritePopgroupModel.findById(id);
  if (!popgroup) {
    return next(new Error('Popgroup not found', { cause: 404 }));
  }

  if (!popgroup.image || !popgroup.image.public_id) {
    return next(new Error('No image found to remove', { cause: 400 }));
  }

  // Delete image from Cloudinary
  await deleteImageFromCloudinary(popgroup.image.public_id);

  // Remove image from database
  const updatedPopgroup = await FavoritePopgroupModel.findByIdAndUpdate(
    id,
    {
      image: {},
      updatedBy: userId,
      updatedAt: new Date()
    },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: 'Popgroup image removed successfully',
    data: updatedPopgroup
  });
});