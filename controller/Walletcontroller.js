import mongoose from "mongoose";
import WalletModel from "./../model/Walletmodel.js";
import TransactionModel from "./../model/TransactionModel.js";

export const addMoneyController = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction(); //for secure transaction
  try {
    const { phone_no, amount, razorpayPaymentId } = req.body;

    if (!phone_no || !amount || !razorpayPaymentId) {
      return res.status(400).send({
        message: "Phone number , amount , and payment Id are required",
      });
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      return res
        .status(400)
        .send({ message: "Amount must be a positive number" });
    }

    let wallet = await WalletModel.findOne({ phone_no }).session(session);

    if (!wallet) {
      wallet = new WalletModel({ phone_no, balance: 0 });
    }
    // update balance in wallet
    wallet.balance += numericAmount;
    await wallet.save({ session });

    // record of transaction
    await TransactionModel.create(
      [
        {
          walletId: wallet._id,
          amount: numericAmount,
          type: "credit",
          status: "successful",
          razorpayPaymentId: razorpayPaymentId,
        },
      ],
      { session }
    );

    await session.commitTransaction(); //ACID property for final commit
    session.endSession();

    return res.status(200).send({
      success: true,
      message: `₹${numericAmount} added to wallet successfully.`,
      newBalance: wallet.balance,
    });
  } catch (error) {
    await session.abortTransaction(); // गलती होने पर सब कुछ वापस करें
    session.endSession();
    console.error("Error in addMoneyController:", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal Server Error" });
  }
};

// to get balance from wallet

export const getBalanceController = async (req, res) => {
  try {
    const { phone_no } = req.params;

    if (!phone_no) {
      return res.status(400).send({ message: "Phone number is required." });
    }
    const wallet = await WalletModel.findOne({ phone_no });
    if (!wallet) {
      // if user don't have wallet then show balance 0
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
