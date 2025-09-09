// backend/controllers/WalletController.js
// --- FINAL CORRECTED CODE ---

import mongoose from "mongoose";
// ध्यान दें: सुनिश्चित करें कि आपकी फाइल का नाम "walletmodel.js" (सब छोटा) ही है।
import WalletModel from "../model/Walletmodel.js";
import TransactionModel from "../model/TransactionModel.js";

export const addMoneyController = async (req, res) => {
  console.log("Phone from params:", req.params.phone_no);
  console.log("Phone from user:", req.user?.phone_no);

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { amount, razorpayPaymentId } = req.body;
    const { phone_no } = req.params; // <-- Yahan se lo

    if (!phone_no || !amount || !razorpayPaymentId) {
      return res.status(400).send({
        message: "Phone number, amount, and payment ID are required",
      });
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      return res
        .status(400)
        .send({ message: "Amount must be a positive number" });
    }

    // यहाँ ठीक किया गया: walletmodel -> WalletModel
    let wallet = await WalletModel.findOne({ phone_no }).session(session);

    if (!wallet) {
      // यहाँ भी ठीक किया गया: walletmodel -> WalletModel
      wallet = new WalletModel({ phone_no, balance: 0 });
    }

    wallet.balance += numericAmount;
    await wallet.save({ session });

    await TransactionModel.create(
      [
        {
          walletId: wallet._id,
          amount: numericAmount,
          type: "credit",
          status: "successful",
          razorpayPaymentId: razorpayPaymentId,
          description: "Wallet recharge via Razorpay",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(200).send({
      success: true,
      message: `₹${numericAmount} added to wallet successfully.`,
      newBalance: wallet.balance,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error in addMoneyController:", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal Server Error" });
  }
};

// getBalanceController पहले से ही सही था
export const getBalanceController = async (req, res) => {
  try {
    const { phone_no } = req.params;

    if (!phone_no) {
      return res.status(400).send({ message: "Phone number is required." });
    }
    const wallet = await WalletModel.findOne({ phone_no });
    if (!wallet) {
      return res.status(200).send({
        success: true,
        balance: 0,
      });
    }
    return res.status(200).send({
      success: true,
      balance: wallet.balance,
    });
  } catch (error) {
    console.error("Error in getBalanceController:", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal Server Error" });
  }
};

export const getTransactionHistoryController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    const wallet = await WalletModel.findOne({ phone_no });

    if (!wallet) {
      return res.status(200).json({ success: true, transactions: [] }); // Khaali list bhejein
    }

    const transactions = await TransactionModel.find({
      walletId: wallet._id,
    }).sort({ createdAt: -1 }); // Sabse naya sabse upar

    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching transaction history" });
  }
};
