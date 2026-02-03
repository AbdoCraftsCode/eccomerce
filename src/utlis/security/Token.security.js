import jwt from "jsonwebtoken";

import Usermodel from "../../DB/models/User.model.js";
import * as dbservice from "../../DB/dbservice.js";

export const tokenTypes = {
  access: "access",
  refresh: "refresh",
};

export const decodedToken = async ({
  authorization = "",
  tokenType = tokenTypes.access,
  next,
} = {}) => {
  if (!authorization) {
    return next(new Error("Authorization header is required", { cause: 400 }));
  }

  const [bearer, token] = authorization.split(" ") || [];
  if (!bearer || !token) {
    return next(new Error("Invalid authorization format", { cause: 400 }));
  }

  const decoded = verifytoken({
    token,
    signature: process.env.JWT_SECRET,
  });
  if (!decoded?.id) {
    return next(new Error("Invalid token", { cause: 401 }));
  }

  const user = await dbservice.findOne({
    model: Usermodel,
    filter: { _id: decoded.id },
    populate: [{ path: "currency" , select :"code"}],
  });

  if (!user) {
    return next(new Error("User not found", { cause: 404 }));
  }

  if (user.changecredintialTime?.getTime() >= decoded.iat * 1000) {
  }

  return user;
};

export const generatetoken = ({
  payload = {},

  signature = process.env.JWT_SECRET,
  expiresIn = "365d",
} = {}) => {
  console.log("✅ Token Payload:", payload);
  console.log("✅ Expires In:", expiresIn);

  const token = jwt.sign(payload, signature, { expiresIn });
  console.log("✅ Generated Token:", token);

  return token;
};

export const verifytoken = ({
  token = "",
  signature = process.env.JWT_SECRET,
} = {}) => {
  const decoded = jwt.verify(token, signature);
  return decoded;
};


