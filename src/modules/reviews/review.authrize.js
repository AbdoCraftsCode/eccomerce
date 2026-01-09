export const endpoint = {
  create: ["User", "Admin", "Owner"],
  update: ["User", "Admin", "Owner"],
  delete: ["User", "Admin", "Owner"],
  getSingle: ["User", "vendor", "Admin", "Owner", "Guest"],
  getAll: ["User", "vendor", "Admin", "Owner", "Guest"],
  getProductReviews: ["User", "vendor", "Admin", "Owner", "Guest"],
  getMyReviews: ["User", "Admin", "Owner"]
};