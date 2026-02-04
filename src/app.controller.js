import { connectDB } from "./DB/connection.js";
import { globalerror } from "./utlis/response/error.response.js";

import addressRouter from "./modules/address/address.controller.js";
import reviewRouter from "./modules/reviews/review.controller.js";

import authcontroller from "./modules/auth/auth.controller.js";
import usercontroller from "./modules/user/user.controller.js";
import paymentcontroller from "./modules/payments/checkout.controller.js";

import flavorRouter from './modules/preference/controllers/flavor.controller.js';
import popgroupRouter from './modules/preference/controllers/popgroup.controller.js';
import productTypeRouter from './modules/preference/controllers/productType.controller.js';
import profilsRouter from './modules/profiles/profile.routes.js';
import cartRoutes from './modules/cart/cart.routes.js';
import walletRouter from './modules/wallet/wallet.controller.js';

import adminRoutes from "./modules/adminPanel/admin.routes.js";
import searchRoutes from "./modules/search/search.controller.js";
import faqRoutes from "./modules/faq/faq.routes.js";
import offersRoutes from "./modules/offers/offers.routes.js";
import currenciesRoutes from "./modules/currency/currency.routes.js";
import countriesRoutes from "./modules/country/country.routes.js";
import slidersRoutes from "./modules/sliders/slider.routes.js";
import invoicesRoutes from "./modules/invoice/invoice.routes.js";


import cors from "cors";


export const bootstap = (app, express) => {
  app.use(cors());
  app.use(express.json());
  connectDB();
  app.use("/auth", authcontroller);
  app.use("/user", usercontroller);
  app.use("/address", addressRouter);
  app.use("/reviews", reviewRouter);
  app.use("/payment", paymentcontroller);
  app.use("/flavors", flavorRouter);
  app.use("/popgroups", popgroupRouter);
  app.use("/product-types", productTypeRouter);
  app.use("/profiles", profilsRouter);
  app.use("/cart", cartRoutes);
  app.use("/wallet", walletRouter);
  app.use("/dashboard", adminRoutes);
  app.use("/search", searchRoutes);
  app.use("/faq", faqRoutes);
  app.use("/offers", offersRoutes);
  app.use("/currencies", currenciesRoutes);
  app.use("/countries", countriesRoutes);
  app.use("/sliders", slidersRoutes);

  app.use("/invoice", invoicesRoutes);


  app.use(globalerror);
};

export default bootstap;
