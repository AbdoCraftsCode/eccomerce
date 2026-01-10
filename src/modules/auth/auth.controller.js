import { Router } from "express";
import { validation } from "../../middlewere/validation.middlewere.js";
import  * as validators from "../auth/auth.validate.js"
import { addAuthorizedUser, addAuthorizedUserToSupermarket, addProduct, addSection, confirmOTP, createAdminUser, createAppointment, createBranch, createDoctor, createEvaluation, createMainGroup, createMode, createOrder, createOrderSupermarket, createPaidService, createPaidServiceDrivers, createPermissions, createProduct, createPropertyBooking, createQuestion, createRentalProperty, createReport, createRestaurant, createService, createSubGroup, createSubscriptionPlan, createSupermarket, createUserByOwner, deleteAdminUser, deleteAppSettings, deleteBranch, deleteDoctor, deleteMainGroup, deletePermission, deleteProduct, deleteProducts, deleteRentalProperty, deleteRestaurant, deleteSection, deleteSingleQuestion, deleteSubGroup, deleteSubscriptionPlan, deleteSupermarket, deleteUserByAdmin, deleteUserByOwner, findNearbyDrivers, forgetPassword, getAcceptedOrders, getAccessibleSupermarket, getAllAdminUsers, getAllImages, getAllNormalUsers, getAllPaidServiceDrivers, getAllPaidServices, getAllPaidServicesadmin, getAllPermissions, getAllRentalProperties, getAllServiceProviders, getAllSubscriptionPlans, getBranches, getClinetHistory, getDeliveredOrdersByDriver, getDoctorAppointments, getDoctors, getDriverHistory, getDriverOrdersStats, getDriverStats, getEvaluations, getMainGroupsForUser, getMainGroupsWithSubGroups, getManagerRestaurants, getMyDoctorProfile, getMyEvaluations, getMyRestaurantsProducts, getMySubGroups, getNotificationsByDoctor, getNotificationsByProperty, getNotificationsByRestaurant, getNotificationsByUser, getOwnerRestaurants, getProductsByRestaurant, getPropertyBookings, getQuestionsByMainGroups, getReports, getRestaurantOrders, getRestaurants, getRideRequestById, getServices, getSubGroupsByMainGroup, getSupermarket, getSupermarketAdmin, getSupermarketNotifications, getSupermarketOrders, getSupermarketSections, getSupermarketWithSectionsAndProducts, getUserOrders, getUserRentalProperties, getUsersByOwner, markAllNotificationsAsRead, markAllNotificationsAsReadDoctor, markAllNotificationsAsReadProperty, registerRestaurant, resetPassword, sendotpphone, signup, signupServiceProvider, signupwithGmail, updateAdminUser, updateBranch, updateDoctor, updateMainGroup, updateMyProfile, updateOrderStatus, updateOrderStatusSupermarket, updatePermission, updateProduct, updateProductsupermarket, updateRentalProperty, updateRestaurant, updateSection, updateService, updateSingleQuestion, updateSubGroup, updateSubscription, updateSubscriptionPlan, updateSupermarket, updateUser, updateUserByOwner, uploadImages,  } from "./service/regestration.service.js";
import { applyCoupon, becomeSeller, confirOtp, createAttribute, createAttributeValue, createBrand, createCategory, createCategoryRequest, createCoupon, createOrderforUser, createOrUpdateSettings, CreateProdut, createVariant, deleteAttribute, deleteBrand, deleteCategory, deleteCoupon, deleteMyAccount, DeleteProduct, deleteVariant, filterProducts, forgetpassword, forgetPasswordphone, forgetPasswordphoneadmin, getAllNotificationsAdmin, getAllOrdersAdmin,getProductByIdForEndUser , GetAllProducts, getAllVendors, getAllVendorsWithStats, getAppSettingsAdmin, getAttributesWithValues, getAttributeValues, getBrandById, GetBrands, getBrands, getCategories, getCategoriesLocalized, getCategoryRequests, getCategoryTreeById, getCouponDetails, getCustomersWithOrders, getMyCompactProfile, getMyCoupons, getMyNotifications, GetMyOrders, getMyProfile, getOrderDetails, getOrderDetailsAdmin, GetProductById, getProducts, GetProductsByCategory, getSettings, getVariants, getVendorDashboardStats, getVendorDetailedStats, getVendorDetails, getVendorOrders, getVendorSalesChart, login, loginAdmin, loginRestaurant, loginwithGmail, loginWithPassword, MarkAllNotificationsAsRead, refreshToken, resendOTP, resetpassword, resetPasswordphone, sendOtpforeach, updateAttribute, updateBrand, updateCategory, updateCategoryRequest, updateCoupon, UpdateProduct, updateVariant, updateVendorStatus, verifyOTP, verifyOtpLogin } from "./service/authontecation.service.js";
import { authentication, checkRestaurantPermission } from "../../middlewere/authontcation.middlewere.js";

const routr = Router()



import axios from "axios";
import dotenv from "dotenv";
import { fileValidationTypes, uploadCloudFile } from "../../utlis/multer/cloud.multer.js";
import { DeleteVariant } from "../user/service/profile.service.js";

dotenv.config();

routr.post(


    "/createDoctor",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "profileImage", maxCount: 1 },
        { name: "certificates", maxCount: 10 }
    ]),
    createDoctor
);


routr.patch(
    "/updateDoctor/:id",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "profileImage", maxCount: 1 },
        { name: "certificates", maxCount: 10 }
    ]),
    updateDoctor
);



routr.post(
    "/signupServiceProvider",
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "nationalIdImage", maxCount: 1 },
        { name: "driverLicenseImage", maxCount: 1 },
        { name: "profiePicture", maxCount: 1 },
        { name: "carLicenseImage", maxCount: 1 },
        { name: "carImages", maxCount: 10 },
        { name: "Insurancedocuments", maxCount: 1 }
    ]),
    signupServiceProvider
);

routr.post(
    "/createRentalProperty",
    authentication(), // تحقق من التوكن
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "images", maxCount: 10 } // صور العقار
    ]),
    createRentalProperty
);

routr.get(
    "/getAllPaidServicesadmin",

    getAllPaidServicesadmin
);


routr.post(
    "/createRestaurant",
    authentication(), // تحقق من التوكن
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "image", maxCount: 10 },
        { name: "menuImages", maxCount: 10 } // صور العقار
    ]),
    createRestaurant
);


routr.patch(
    "/updateMyProfile",
    authentication(), // تحقق من التوكن
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "carImages", maxCount: 10 },
        { name: "profiePicture", maxCount: 10 } // صور العقار
    ]),
    updateMyProfile
);



routr.post("/uploadImages",
    authentication(),

    uploadCloudFile(fileValidationTypes.image).array("images"),
    uploadImages
)



routr.post(
    "/CreateProdut",
    authentication(),

    uploadCloudFile(fileValidationTypes.image).array("images"),
  CreateProdut
);


routr.post(
    "/createVariant",
    // authentication(),
    uploadCloudFile(fileValidationTypes.image).array("images"),
    createVariant
);




routr.post(
    "/createSupermarket",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "image", maxCount: 1 },          // cover image
        { name: "bannerImages", maxCount: 10 }   // banners
    ]),
    createSupermarket
);


routr.patch(
    "/updateSupermarket/:id",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "image", maxCount: 1 },          // cover image
        { name: "bannerImages", maxCount: 10 }   // banners
    ]),
    updateSupermarket
);





routr.post(
    "/addProduct/:sectionId",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image
    ]).fields([
        { name: "images", maxCount: 10 }
    ]),
    addProduct
);

routr.post(
    "/createProduct",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "images", maxCount: 10 }
    ]),
    checkRestaurantPermission(["manager"]),
    createProduct
);




routr.post("/signup", signup)
routr.post("/loginWithPassword", loginWithPassword)
routr.get("/getAllVendors", getAllVendors)

routr.put("/updateVendorStatus/:vendorId", updateVendorStatus)


routr.get("/getAllImages", getAllImages)
routr.get("/getSupermarket", getSupermarket)
routr.get("/getSupermarketSections/:id", getSupermarketSections)
routr.post("/addSection/:supermarketId",authentication(), addSection)
routr.post("/createOrder",authentication() ,createOrder)
routr.post("/loginAdmin", loginAdmin)
routr.post("/markAllNotificationsAsReadDoctor/:doctorId", markAllNotificationsAsReadDoctor)
routr.post("/createAppointment", authentication(),createAppointment)

routr.get("/getRestaurants", getRestaurants)
routr.get("/getNotificationsByUser/:userId", getNotificationsByUser)
routr.get("/getReports", getReports)
routr.post("/createReport", createReport)
routr.patch("/updateUser/:id", updateUser)
routr.get("/findNearbyDrivers", findNearbyDrivers)
routr.get("/getDriverHistory/:driverId", getDriverHistory)
routr.get("/getNotificationsByDoctor/:doctorId", getNotificationsByDoctor)
routr.get("/getDoctorAppointments/:doctorId", getDoctorAppointments)



routr.get("/getUserOrders", getUserOrders)

routr.get("/getProducts", authentication(),getProducts)

routr.get("/getDriverStats/:driverId", getDriverStats)


routr.get("/getDriverOrdersStats/:driverId", getDriverOrdersStats)

routr.get("/getManagerRestaurants", authentication(),getManagerRestaurants)
routr.get("/getOwnerRestaurants", authentication(), getOwnerRestaurants)
routr.get("/getMyRestaurantsProducts/:restaurantId", authentication(), getMyRestaurantsProducts)
routr.get("/getProductsByRestaurant/:restaurantId", getProductsByRestaurant)
routr.get("/getUserRentalProperties", authentication(), getUserRentalProperties)

routr.get("/getRestaurantOrders/:restaurantId", getRestaurantOrders)
routr.patch("/updateOrderStatusSupermarket/:orderId", uploadCloudFile([
    ...fileValidationTypes.image,
    ...fileValidationTypes.document
]).fields([
    { name: "image", maxCount: 10 } // صور العقار
]), updateOrderStatusSupermarket)

routr.post(
    "/createService",
    uploadCloudFile(fileValidationTypes.image).fields([{ name: "servicePicture", maxCount: 1 }]),
    createService
);


routr.post(
    "/createPaidService",
    authentication(),
    uploadCloudFile(fileValidationTypes.image).fields([{ name: "invoiceImage", maxCount: 1 }]),
    createPaidService
);

routr.post(
    "/createPaidServiceDrivers",
    authentication(),
    uploadCloudFile(fileValidationTypes.image).fields([{ name: "invoiceImage", maxCount: 1 }]),
    createPaidServiceDrivers
);


routr.patch(
    "/updateProductsupermarket/:id",
    authentication(),
    uploadCloudFile(fileValidationTypes.image).fields([{ name: "images", maxCount: 10 }]),
    updateProductsupermarket
);




routr.patch(
    "/updateService/:id",
    uploadCloudFile(fileValidationTypes.image).fields([{ name: "servicePicture", maxCount: 1 }]),
    updateService
);
routr.post("/addAuthorizedUser", authentication(), addAuthorizedUser)
routr.get("/getAcceptedOrders", getAcceptedOrders)
routr.get("/getServices", getServices)
routr.get("/getSupermarketOrders/:supermarketId", getSupermarketOrders)
routr.get("/getSupermarketNotifications/:supermarketId", getSupermarketNotifications)
routr.post("/createOrderSupermarket", authentication(), createOrderSupermarket)
routr.get("/getMyProfile", authentication(), getMyProfile)
routr.get("/getAccessibleSupermarket", authentication(), getAccessibleSupermarket)

routr.get("/getSupermarketWithSectionsAndProducts/:supermarketId", authentication(), getSupermarketWithSectionsAndProducts)

routr.post("/addAuthorizedUserToSupermarket", authentication(), addAuthorizedUserToSupermarket)


routr.patch("/updateUserByOwner/:id", authentication(), updateUserByOwner)
routr.delete("/deleteUserByOwner/:userId", authentication(), deleteUserByOwner)
routr.get("/getMyDoctorProfile", authentication(), getMyDoctorProfile)
routr.delete("/deleteDoctor/:id", authentication(), deleteDoctor)
routr.post("/registerRestaurant", registerRestaurant)

routr.post("/verifyOTP", verifyOTP)


routr.patch("/updateSection/:id", authentication(), updateSection)

routr.delete("/deleteSection/:id", authentication(), deleteSection)

routr.delete("/deleteProducts/:id", authentication(), deleteProducts)

routr.post("/createOrUpdateSettings", createOrUpdateSettings)
routr.post("/createCategory", uploadCloudFile(fileValidationTypes.image).array("images"),
    
     createCategory)

routr.get("/getSettings", getSettings)

routr.get("/getCategories", getCategories)

routr.put("/updateCategory/:categoryId",
    uploadCloudFile(fileValidationTypes.image).array("images"),
    updateCategory)
routr.delete("/deleteCategory/:categoryId", deleteCategory)

routr.post("/createAttribute", authentication(), createAttribute)

routr.post("/createAttributeValue", authentication(),createAttributeValue)

routr.get("/getAttributesWithValues", authentication(), getAttributesWithValues)


routr.post("/forgetPassword", forgetPassword)

routr.get("/getAttributeValues/:attributeId", getAttributeValues)

routr.delete("/deleteAppSettings", deleteAppSettings)

routr.delete("/deleteProduct/:id" ,deleteProduct)

routr.get("/getAppSettingsAdmin", getAppSettingsAdmin)

routr.patch(
    "/updateProduct/:id",
    authentication(),
    uploadCloudFile([...fileValidationTypes.image]).fields([
        { name: "images", maxCount: 10 }
    ]),
    updateProduct
);



routr.patch(
    "/updateRestaurant/:id",
    authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "image", maxCount: 1 },          // الصورة الرئيسية للمطعم
        { name: "menuImages", maxCount: 10 }     // صور قائمة الطعام
    ]),
    updateRestaurant
);









routr.get("/getDeliveredOrdersByDriver", getDeliveredOrdersByDriver)
routr.get("/getRideRequestById/:driverId", getRideRequestById)

routr.get("/getVariants/:productId", getVariants)

routr.get("/getAllSubscriptionPlans", getAllSubscriptionPlans)


routr.delete("/deleteAttribute/:attributeId", deleteAttribute)

routr.delete("/deleteSupermarket/:id",authentication() ,deleteSupermarket)


routr.patch("/updateRentalProperty/:id", authentication(),
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "images", maxCount: 10 } // صور العقار
    ]),
    updateRentalProperty)
routr.post("/confirOtp", confirOtp)

routr.get("/GetBrands", GetBrands)

routr.put("/updateAttribute/:attributeId", updateAttribute)


routr.delete("/deleteRestaurant/:id",authentication() ,deleteRestaurant)

routr.post("/resetPassword",resetPassword)
routr.get("/getClinetHistory/:clientId", getClinetHistory)
routr.post("/login", login)

routr.get("/getDoctors", getDoctors)
routr.get("/getAllRentalProperties", getAllRentalProperties)
routr.post("/createBranch", authentication(), createBranch)
routr.delete("/deleteRentalProperty/:id", authentication(), deleteRentalProperty)
routr.post("/loginRestaurant", loginRestaurant)
routr.post("/resendOTP",resendOTP )
routr.post("/resetpassword", resetpassword) 
routr.patch("/resetPasswordphone", resetPasswordphone)

routr.put("/UpdateProduct/:productId",
    uploadCloudFile(fileValidationTypes.image).array("images"),
    UpdateProduct)

routr.delete("/DeleteProduct/:productId", DeleteProduct)


routr.put(
    "/updateVariant/:variantId",
    // authentication(),
    uploadCloudFile(fileValidationTypes.image).array("images"),
    updateVariant
);


routr.post("/signupwithGmail", signupwithGmail)

routr.get("/getBrandById/:brandId", getBrandById)

routr.get("/getCategoryTreeById/:categoryId", getCategoryTreeById)

routr.get("/GetProductById/:productId",authentication() ,GetProductById)


routr.get("/getOrderDetails/:orderId", authentication(), getOrderDetails)

routr.post("/verifyOtpLogin", verifyOtpLogin)
routr.post("/becomeSeller", becomeSeller)

routr.post("/sendOtpforeach", sendOtpforeach)

routr.delete("/deleteUserByAdmin/userId", deleteUserByAdmin)

routr.get("/getAllOrdersAdmin",authentication() ,getAllOrdersAdmin)



routr.get("/getOrderDetailsAdmin/:orderId", authentication(), getOrderDetailsAdmin)

routr.get("/getVendorDetails/:vendorId", authentication(), getVendorDetails)

routr.get("/getCouponDetails/:couponId", authentication(), getCouponDetails)

routr.delete("/DeleteVariant/variantId", DeleteVariant)


routr.get("/GetAllProducts",authentication(), GetAllProducts)

routr.get("/:productId",getProductByIdForEndUser);

routr.get("/getCategoriesLocalized", getCategoriesLocalized)

routr.get("/GetProductsByCategory/:categoryId", GetProductsByCategory)


// routr.post("/confirmOTP", confirmOTP)
routr.post("/sendotpphone", sendotpphone)
routr.post("/confirmOTP", confirmOTP)

routr.get("/filterProducts", filterProducts)

routr.get("/getNotificationsByRestaurant/:restaurantId", getNotificationsByRestaurant)

routr.patch(
    "/updateOrderStatus/:orderId",
    uploadCloudFile([
        ...fileValidationTypes.image,
        ...fileValidationTypes.document
    ]).fields([
        { name: "image", maxCount: 10 } // صور الفاتورة
    ]),
    updateOrderStatus
);


routr.post(
    "/createBrand",
 
    uploadCloudFile(fileValidationTypes.image).single("image"),
    createBrand
);


routr.get("/getAllNormalUsers", getAllNormalUsers)
routr.get("/getBrands", getBrands)

routr.get("/getSupermarketAdmin", getSupermarketAdmin)
routr.get("/getPropertyBookings/:propertyId", getPropertyBookings)
routr.get("/getNotificationsByProperty/:propertyId", getNotificationsByProperty)
routr.patch("/markAllNotificationsAsReadProperty/:propertyId", markAllNotificationsAsReadProperty)
routr.get("/getAllServiceProviders", getAllServiceProviders)

routr.post("/getBranches", authentication(), getBranches)

routr.post("/createCoupon", authentication(), createCoupon)

routr.get("/getMyCoupons", authentication(), getMyCoupons)


routr.get("/GetMyOrders", authentication(), GetMyOrders)


routr.post("/applyCoupon", authentication(), applyCoupon)

routr.get("/getVendorOrders", authentication(), getVendorOrders)

routr.get("/getVendorDashboardStats", authentication(), getVendorDashboardStats)

routr.get("/getCustomersWithOrders", authentication(), getCustomersWithOrders)


// this endpoint will ignored 
// routr.post("/createOrderforUser", authentication(), createOrderforUser)


routr.post("/createUserByOwner", authentication(), createUserByOwner)

routr.get("/getUsersByOwner", authentication(), getUsersByOwner)

routr.get("/getAllVendorsWithStats", getAllVendorsWithStats)

routr.get("/getVendorDetailedStats/:vendorId", getVendorDetailedStats)


routr.get("/getVendorSalesChart/:vendorId", getVendorSalesChart)

routr.get("/getCategoryRequests", getCategoryRequests)

routr.get("/getAllNotificationsAdmin", getAllNotificationsAdmin)

routr.delete("/deleteMyAccount", authentication(), deleteMyAccount)

routr.post("/createCategoryRequest", authentication(), createCategoryRequest)

routr.delete("/deleteCoupon/:couponId", authentication(), deleteCoupon)

routr.get("/getMyNotifications", authentication(), getMyNotifications)

routr.put("/updateCategoryRequest/:requestId", updateCategoryRequest)


routr.put("/updateCoupon/:couponId", authentication(), updateCoupon)

routr.post("/MarkAllNotificationsAsRead", authentication(), MarkAllNotificationsAsRead)

routr.post("/createPropertyBooking", authentication(), createPropertyBooking)

routr.get("/getMainGroupsForUser", authentication(), getMainGroupsForUser)

routr.get("/getMainGroupsWithSubGroups", authentication(), getMainGroupsWithSubGroups)

routr.delete("/deleteBranch/:id", authentication(), deleteBranch)


routr.delete("/deleteBrand/:brandId",  deleteBrand)


routr.put("/updateBrand/:brandId",
    

    uploadCloudFile(fileValidationTypes.image).single("image"),
    updateBrand);

routr.delete("/deleteAdminUser/:id", authentication(), deleteAdminUser)

routr.put("/updateBranch/:id", authentication(), updateBranch)
routr.post("/refreshToken", refreshToken)
routr.patch("/updateSubscriptionPlan/:id", updateSubscriptionPlan)
routr.delete("/deleteSubscriptionPlan/:id", deleteSubscriptionPlan)

routr.get("/getAllPaidServices", getAllPaidServices)
routr.get("/getAllPaidServiceDrivers", getAllPaidServiceDrivers)

routr.post("/createSubscriptionPlan", createSubscriptionPlan)
routr.patch("/updateSubscription/:userId", updateSubscription)

routr.post("/createMainGroup", authentication(), createMainGroup)
routr.get("/getMyCompactProfile", authentication(), getMyCompactProfile)

routr.post("/createSubGroup", authentication(), createSubGroup)
routr.post("/forgetpassword", forgetpassword)
routr.post("/forgetpasswordphone", forgetPasswordphone)
routr.post("/forgetPasswordphoneadmin", forgetPasswordphoneadmin)
routr.post("/loginwithGmail", loginwithGmail)
routr.delete("/deleteMyAccount", authentication(), deleteMyAccount)
routr.delete("/deleteMainGroup/:id", authentication(), deleteMainGroup)
routr.delete("/deletePermission/:id", authentication(), deletePermission)
routr.patch("/updatePermission/:id", authentication(), updatePermission)
routr.delete("/deleteSubGroup/:id", authentication(), deleteSubGroup)
routr.patch("/updateMainGroup/:id", authentication(), updateMainGroup)
routr.patch("/updateSubGroup/:id", authentication(), updateSubGroup)
routr.post("/createEvaluation", authentication(), createEvaluation)

routr.post("/createPermissions", createPermissions)
routr.post("/createMode",authentication(), createMode)
routr.post("/createQuestion", authentication(), createQuestion)
routr.post("/getMyEvaluations", authentication(), getMyEvaluations)
routr.get("/getMySubGroups", authentication(), getMySubGroups)
routr.delete("/deleteSingleQuestion/:mainId/:questionId", deleteSingleQuestion)
routr.patch("/updateSingleQuestion/:mainId/:questionId", updateSingleQuestion)
routr.get("/getEvaluations", authentication(), getEvaluations)
routr.get("/getQuestionsByMainGroups", authentication(), getQuestionsByMainGroups)
routr.get("/getAllPermissions", getAllPermissions)
routr.post("/markAllNotificationsAsRead/:restaurantId", markAllNotificationsAsRead)

routr.get("/getSubGroupsByMainGroup/:mainGroupId", authentication(), getSubGroupsByMainGroup)

routr.post("/createAdminUser",
    authentication(),
    uploadCloudFile(fileValidationTypes.image).fields([
        { name: "image", maxCount: 1 } // ✅ صورة واحدة فقط
    ]),
    createAdminUser
);


routr.patch("/updateAdminUser/:id",
    authentication(),
    uploadCloudFile(fileValidationTypes.image).fields([
        { name: "image", maxCount: 1 } // ✅ صورة واحدة فقط
    ]),
    updateAdminUser
);


routr.get("/getAllAdminUsers", authentication(), getAllAdminUsers)
export default routr