import { v2 as cloudinary } from 'cloudinary';


export const uploadReviewImages = async (files) => {
  try {
    const uploadedImages = [];
    
    if (files?.images) {
      for (const file of files.images) {
        const uploaded = await cloudinary.uploader.upload(file.path, {
          folder: "reviews",
          resource_type: "image",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" }
          ]
        });
        
        uploadedImages.push({
          secure_url: uploaded.secure_url,
          public_id: uploaded.public_id,
          original_filename: file.originalname,
          uploaded_at: new Date()
        });
      }
    }
    
    return uploadedImages;
  } catch (error) {
    console.error("Error uploading review images:", error);
    throw new Error("Failed to upload review images");
  }
};

export const deleteReviewImages = async (images) => {
  try {
    if (!images || !Array.isArray(images) || images.length === 0) {
      return;
    }
    
    const deletePromises = images.map(image => {
      if (image.public_id) {
        return cloudinary.uploader.destroy(image.public_id, {
          resource_type: "image"
        });
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${images.length} review images from Cloudinary`);
  } catch (error) {
    console.error("Error deleting review images:", error);
  }
};

export const cleanupUnusedImages = async (currentImages, newImages) => {
  try {
    if (!currentImages || !Array.isArray(currentImages)) return;
    
    const imagesToDelete = currentImages.filter(currentImg => {
      return !newImages.some(newImg => 
        newImg.public_id === currentImg.public_id
      );
    });
    
    if (imagesToDelete.length > 0) {
      await deleteReviewImages(imagesToDelete);
    }
  } catch (error) {
    console.error("Error cleaning up unused images:", error);
  }
};