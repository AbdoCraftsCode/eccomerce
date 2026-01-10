import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producttttt",
    required: true
  },
  
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Variant"
  },
  
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true
  },
  
  items: [cartItemSchema],
  
  totalItems: {
    type: Number,
    default: 0
  },
  
  subTotal: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});


cartSchema.pre("save", async function(next) {
  this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  
  this.subTotal = 0;
  
  for (const item of this.items) {
    let price = 0;
    
    if (item.variantId) {
      const variant = await mongoose.model("Variant").findById(item.variantId);
      if (variant) {
        price = variant.price;
      }
    } else {
      const product = await mongoose.model("Producttttt").findById(item.productId);
      if (product) {
        price = product.disCountPrice ? parseFloat(product.disCountPrice) : parseFloat(product.mainPrice);
      }
    }
    
    this.subTotal += price * item.quantity;
  }
  
  this.subTotal = parseFloat(this.subTotal.toFixed(2));
  
  next();
});

cartSchema.index({ userId: 1 });

cartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ userId }).populate({
    path: 'items.productId',
    select: 'name images mainPrice disCountPrice finalPrice stock'
  }).populate({
    path: 'items.variantId',
    select: 'price finalPrice disCountPrice stock images'
  });
  
  if (!cart) {
    cart = await this.create({ userId, items: [] });
  }
  
  return cart;
};

export const CartModel = mongoose.model("Cart", cartSchema);