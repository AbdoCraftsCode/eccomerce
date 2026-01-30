import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import * as validators from "../auth/auth.validate.js";
import {
  addAuthorizedUser,
  addProduct,
  addSection,
  confirmOTP,
  createAdminUser,
  createPermissions,
  createProduct,
  createPropertyBooking,
  createUserByOwner,
  deleteAdminUser,
  deleteAppSettings,
  deletePermission,
  deleteProduct,
  deleteProducts,
  deleteRentalProperty,
  deleteSection,
  deleteUserByAdmin,
  deleteUserByOwner,
  forgetPassword,
  getAllAdminUsers,
  getAllImages,
  getAllNormalUsers,
  getAllPermissions,
  getAllRentalProperties,
  getAllServiceProviders,
  getNotificationsByProperty,
  getNotificationsByUser,
  getPropertyBookings,
  getUserRentalProperties,
  getUsersByOwner,
  markAllNotificationsAsRead,
  markAllNotificationsAsReadProperty,
  resetPassword,
  sendotpphone,
  signup,
  signupServiceProvider,
  signupwithGmail,
  updateAdminUser,
  updatePermission,
  updateProduct,
  updateRentalProperty,
  updateSection,
  updateUser,
  updateUserByOwner,
  uploadImages,
} from "./service/regestration.service.js";
import {
  updateAdminCoupon,
  getAdminCouponDetails,
  getAdminCoupons,
  createAdminCoupon,
  deleteAdminCoupon,
  applyCoupon,
  becomeSeller,
  confirOtp,
  createAttribute,
  createAttributeValue,
  createBrand,
  createCategory,
  createCategoryRequest,
  createCoupon,
  createOrUpdateSettings,
  CreateProdut,
  createVariant,
  deleteAttribute,
  deleteBrand,
  deleteCategory,
  deleteCoupon,
  deleteMyAccount,
  DeleteProduct,
  deleteVariant,
  filterProducts,
  forgetPasswordphone,
  forgetPasswordphoneadmin,
  getAllNotificationsAdmin,
  getAllOrdersAdmin,
  getProductByIdForEndUser,
  GetAllProducts,
  getAllVendors,
  getAllVendorsWithStats,
  getAppSettingsAdmin,
  getAttributesWithValues,
  getAttributeValues,
  getBrandById,
  GetBrands,
  getBrands,
  getCategories,
  getCategoriesLocalized,
  getCategoryRequests,
  getCategoryTreeById,
  getCouponDetails,
  getCustomersWithOrders,
  getMyCompactProfile,
  getMyCoupons,
  getMyNotifications,
  GetMyOrders,
  getMyProfile,
  getOrderDetails,
  getOrderDetailsAdmin,
  GetProductById,
  getProducts,
  GetProductsByCategory,
  getSettings,
  getVariants,
  getVendorDashboardStats,
  getVendorDetailedStats,
  getVendorDetails,
  getVendorOrders,
  getVendorSalesChart,
  login,
  loginAdmin,
  loginRestaurant,
  loginwithGmail,
  loginWithPassword,
  MarkAllNotificationsAsRead,
  refreshToken,
  resendOTP,
  resetPasswordphone,
  sendOtpforeach,
  updateAttribute,
  updateBrand,
  updateCategory,
  updateCategoryRequest,
  updateCoupon,
  UpdateProduct,
  updateVariant,
  updateVendorStatus,
  verifyOTP,
  verifyOtpLogin,
} from "./service/authontecation.service.js";
import { authentication } from "../../middlewere/authontcation.middlewere.js";

const routr = Router();

import axios from "axios";
import dotenv from "dotenv";
import {
  fileValidationTypes,
  uploadCloudFile,
} from "../../utlis/multer/cloud.multer.js";
import { DeleteVariant } from "../user/service/profile.service.js";

dotenv.config();

routr.post(
  "/signupServiceProvider",
  uploadCloudFile([
    ...fileValidationTypes.image,
    ...fileValidationTypes.document,
  ]).fields([
    { name: "nationalIdImage", maxCount: 1 },
    { name: "driverLicenseImage", maxCount: 1 },
    { name: "profiePicture", maxCount: 1 },
    { name: "carLicenseImage", maxCount: 1 },
    { name: "carImages", maxCount: 10 },
    { name: "Insurancedocuments", maxCount: 1 },
  ]),
  signupServiceProvider,
);

routr.post(
  "/uploadImages",
  authentication(),

  uploadCloudFile(fileValidationTypes.image).array("images"),
  uploadImages,
);

routr.post(
  "/CreateProdut",
  authentication(),

  uploadCloudFile(fileValidationTypes.image).array("images"),
  CreateProdut,
);

routr.post(
  "/createVariant",
  // authentication(),
  uploadCloudFile(fileValidationTypes.image).array("images"),
  createVariant,
);

routr.post(
  "/addProduct/:sectionId",
  authentication(),
  uploadCloudFile([...fileValidationTypes.image]).fields([
    { name: "images", maxCount: 10 },
  ]),
  addProduct,
);

routr.post("/signup", signup);
routr.post("/loginWithPassword", loginWithPassword);
routr.get("/getAllVendors", getAllVendors);

routr.put("/updateVendorStatus/:vendorId", updateVendorStatus);

routr.get("/getAllImages", getAllImages);

routr.post("/loginAdmin", loginAdmin);

routr.get("/getNotificationsByUser/:userId", getNotificationsByUser);
routr.patch("/updateUser/:id", updateUser);

routr.get("/getProducts", authentication(), getProducts);

routr.post("/addAuthorizedUser", authentication(), addAuthorizedUser);

routr.get("/getMyProfile", authentication(), getMyProfile);

routr.patch("/updateUserByOwner/:id", authentication(), updateUserByOwner);
routr.delete("/deleteUserByOwner/:userId", authentication(), deleteUserByOwner);

routr.post("/verifyOTP", verifyOTP);

routr.patch("/updateSection/:id", authentication(), updateSection);

routr.delete("/deleteSection/:id", authentication(), deleteSection);

routr.delete("/deleteProducts/:id", authentication(), deleteProducts);

routr.post("/createOrUpdateSettings", createOrUpdateSettings);
routr.post(
  "/createCategory",
  uploadCloudFile(fileValidationTypes.image).array("images"),

  createCategory,
);

routr.get("/getSettings", getSettings);

routr.get("/getCategories", getCategories);

routr.put(
  "/updateCategory/:categoryId",
  uploadCloudFile(fileValidationTypes.image).array("images"),
  updateCategory,
);
routr.delete("/deleteCategory/:categoryId", deleteCategory);

routr.post("/createAttribute", authentication(), createAttribute);

routr.post("/createAttributeValue", authentication(), createAttributeValue);

routr.get(
  "/getAttributesWithValues",
  authentication(),
  getAttributesWithValues,
);

routr.post("/forgetPassword", forgetPassword);

routr.get("/getAttributeValues/:attributeId", getAttributeValues);

routr.delete("/deleteAppSettings", deleteAppSettings);

routr.delete("/deleteProduct/:id", deleteProduct);

routr.get("/getAppSettingsAdmin", getAppSettingsAdmin);

routr.patch(
  "/updateProduct/:id",
  authentication(),
  uploadCloudFile([...fileValidationTypes.image]).fields([
    { name: "images", maxCount: 10 },
  ]),
  updateProduct,
);

routr.get("/getVariants/:productId", getVariants);

routr.delete("/deleteAttribute/:attributeId", deleteAttribute);

routr.post("/confirOtp", confirOtp);

routr.get("/GetBrands", GetBrands);

routr.put("/updateAttribute/:attributeId", updateAttribute);

routr.post("/resetPassword", resetPassword);
routr.post("/login", login);

routr.get("/getAllRentalProperties", getAllRentalProperties);
routr.delete(
  "/deleteRentalProperty/:id",
  authentication(),
  deleteRentalProperty,
);
routr.post("/loginRestaurant", loginRestaurant);
routr.post("/resendOTP", resendOTP);
routr.patch("/resetPasswordphone", resetPasswordphone);

routr.put(
  "/UpdateProduct/:productId",
  uploadCloudFile(fileValidationTypes.image).array("images"),
  UpdateProduct,
);

routr.delete("/DeleteProduct/:productId", DeleteProduct);

routr.put(
  "/updateVariant/:variantId",
  // authentication(),
  uploadCloudFile(fileValidationTypes.image).array("images"),
  updateVariant,
);

routr.post("/signupwithGmail", signupwithGmail);

routr.get("/getBrandById/:brandId", getBrandById);

routr.get("/getCategoryTreeById/:categoryId", getCategoryTreeById);

routr.get("/GetProductById/:productId", authentication(), GetProductById);

routr.get("/getOrderDetails/:orderId", authentication(), getOrderDetails);

routr.post("/verifyOtpLogin", verifyOtpLogin);
routr.post("/becomeSeller", becomeSeller);

routr.post("/sendOtpforeach", sendOtpforeach);

routr.delete("/deleteUserByAdmin/userId", deleteUserByAdmin);

routr.get("/getAllOrdersAdmin", authentication(), getAllOrdersAdmin);

routr.get(
  "/getOrderDetailsAdmin/:orderId",
  authentication(),
  getOrderDetailsAdmin,
);

routr.get("/getVendorDetails/:vendorId", authentication(), getVendorDetails);

routr.get("/getCouponDetails/:couponId", authentication(), getCouponDetails);

routr.delete("/DeleteVariant/variantId", DeleteVariant);

routr.get("/GetAllProducts", authentication(), GetAllProducts);

routr.get("/onlyProduct/:productId", getProductByIdForEndUser);

routr.get("/getCategoriesLocalized", getCategoriesLocalized);

routr.get("/GetProductsByCategory/:categoryId", GetProductsByCategory);

routr.post("/sendotpphone", sendotpphone);
routr.post("/confirmOTP", confirmOTP);

routr.get("/filterProducts", filterProducts);

routr.post(
  "/createBrand",

  uploadCloudFile(fileValidationTypes.image).single("image"),
  createBrand,
);

routr.get("/getAllNormalUsers", getAllNormalUsers);
routr.get("/getBrands", getBrands);

routr.get("/getPropertyBookings/:propertyId", getPropertyBookings);
routr.get(
  "/getNotificationsByProperty/:propertyId",
  getNotificationsByProperty,
);
routr.patch(
  "/markAllNotificationsAsReadProperty/:propertyId",
  markAllNotificationsAsReadProperty,
);
routr.get("/getAllServiceProviders", getAllServiceProviders);

routr.post("/createCoupon", authentication(), createCoupon);

routr.get("/getMyCoupons", authentication(), getMyCoupons);

routr.get("/GetMyOrders", authentication(), GetMyOrders);

routr.post("/applyCoupon", authentication(), applyCoupon);

routr.get("/getVendorOrders", authentication(), getVendorOrders);

routr.get(
  "/getVendorDashboardStats",
  authentication(),
  getVendorDashboardStats,
);

routr.get("/getCustomersWithOrders", authentication(), getCustomersWithOrders);

routr.post("/createAdminCoupon", authentication(), createAdminCoupon);
routr.get("/getAdminCoupons", authentication(), getAdminCoupons);
routr.get(
  "/getAdminCouponDetails/:couponId",
  authentication(),
  getAdminCouponDetails,
);
routr.put("/updateAdminCoupon/:couponId", authentication(), updateAdminCoupon);
routr.delete(
  "/deleteAdminCoupon/:couponId",
  authentication(),
  deleteAdminCoupon,
);

routr.post("/createUserByOwner", authentication(), createUserByOwner);

routr.get("/getUsersByOwner", authentication(), getUsersByOwner);

routr.get("/getAllVendorsWithStats", getAllVendorsWithStats);

routr.get("/getVendorDetailedStats/:vendorId", getVendorDetailedStats);

routr.get("/getVendorSalesChart/:vendorId", getVendorSalesChart);

routr.get("/getCategoryRequests", getCategoryRequests);

routr.get("/getAllNotificationsAdmin", getAllNotificationsAdmin);

routr.delete("/deleteMyAccount", authentication(), deleteMyAccount);

routr.post("/createCategoryRequest", authentication(), createCategoryRequest);

routr.delete("/deleteCoupon/:couponId", authentication(), deleteCoupon);

routr.get("/getMyNotifications", authentication(), getMyNotifications);

routr.put("/updateCategoryRequest/:requestId", updateCategoryRequest);

routr.put("/updateCoupon/:couponId", authentication(), updateCoupon);

routr.post(
  "/MarkAllNotificationsAsRead",
  authentication(),
  MarkAllNotificationsAsRead,
);

routr.post("/createPropertyBooking", authentication(), createPropertyBooking);

routr.delete("/deleteBrand/:brandId", deleteBrand);

routr.put(
  "/updateBrand/:brandId",

  uploadCloudFile(fileValidationTypes.image).single("image"),
  updateBrand,
);

routr.delete("/deleteAdminUser/:id", authentication(), deleteAdminUser);

routr.post("/refreshToken", refreshToken);
routr.get("/getMyCompactProfile", authentication(), getMyCompactProfile);

routr.post("/forgetpasswordphone", forgetPasswordphone);
routr.post("/forgetPasswordphoneadmin", forgetPasswordphoneadmin);
routr.post("/loginwithGmail", loginwithGmail);
routr.delete("/deleteMyAccount", authentication(), deleteMyAccount);
routr.delete("/deletePermission/:id", authentication(), deletePermission);
routr.patch("/updatePermission/:id", authentication(), updatePermission);
routr.post("/createPermissions", createPermissions);

routr.get("/getAllPermissions", getAllPermissions);
routr.post(
  "/markAllNotificationsAsRead/:restaurantId",
  markAllNotificationsAsRead,
);

routr.post(
  "/createAdminUser",
  authentication(),
  uploadCloudFile(fileValidationTypes.image).fields([
    { name: "image", maxCount: 1 },
  ]),
  createAdminUser,
);

routr.patch(
  "/updateAdminUser/:id",
  authentication(),
  uploadCloudFile(fileValidationTypes.image).fields([
    { name: "image", maxCount: 1 },
  ]),
  updateAdminUser,
);

routr.get("/getAllAdminUsers", authentication(), getAllAdminUsers);
export default routr;
