import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["topup", "order"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderUser",
      required: function () {
        return this.type === "order";
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const walletSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: "USD",
      uppercase: true,
    },
    transactions: [transactionSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Create or get wallet for user
walletSchema.statics.getOrCreateWallet = async function (userId) {
  try {
    let wallet = await this.findOne({ userId });

    if (!wallet) {
      wallet = await this.create({
        userId,
        balance: 0,
      });
    }

    return wallet;
  } catch (error) {
    throw error;
  }
};

walletSchema.methods.addTransaction = function (transactionData) {
  this.transactions.push(transactionData);
  return this.save();
};

export const WalletModel = mongoose.model("Wallet", walletSchema);
