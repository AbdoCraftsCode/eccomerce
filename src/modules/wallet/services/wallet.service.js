import { asyncHandelr } from "../../../utlis/response/error.response.js";
import { WalletModel } from "../../../DB/models/wallet.model.js";

export const getWallet = asyncHandelr(async (req, res, next) => {
  const userId = req.user._id;
  const { limit = 20, page = 1 } = req.query;

  const limitNum = parseInt(limit);
  const pageNum = parseInt(page);

  const wallet = await WalletModel.getOrCreateWallet(userId);

  if (!wallet) {
    return next(new Error("Failed to create wallet", { cause: 500 }));
  }

  const sortedTransactions = [...wallet.transactions].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const startIndex = (pageNum - 1) * limitNum;
  const endIndex = pageNum * limitNum;
  const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);

  return res.status(200).json({
    success: true,
    message: "Wallet retrieved successfully",
    data: {
      walletId: wallet._id,
      balance: wallet.balance,
      currency: wallet.currency,
      transactions: paginatedTransactions,
      pagination: {
        total: wallet.transactions.length,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(wallet.transactions.length / limitNum),
      },
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    },
  });
});
