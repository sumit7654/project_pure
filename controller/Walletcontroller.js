// backend/controllers/WalletController.js
// --- FINAL CORRECTED CODE ---

// 1. पाथ ठीक किया गया ("models")
// 2. TransactionModel का नाम सही किया गया
import WalletModel from "../model/WalletModel.js";
import TransactionModel from "../model/TransactionModel.js";

// --- पैसे जोड़ने के लिए कंट्रोलर ---
export const addMoneyController = async (req, res) => {
  try {
    const { phone_no, amount, razorpayPaymentId } = req.body;

    if (!phone_no || !amount || !razorpayPaymentId) {
      return res.status(400).send({
        message: "Phone number, amount, and payment ID are required.",
      });
    }

    const numericAmount = Number(amount);
    if (numericAmount <= 0) {
      return res
        .status(400)
        .send({ message: "Amount must be a positive number." });
    }

    let wallet = await WalletModel.findOne({ phone_no });
    if (!wallet) {
      wallet = new WalletModel({ phone_no, balance: 0 });
    }

    wallet.balance += numericAmount;
    await wallet.save();

    // 3. सही मॉडल (TransactionModel) का उपयोग किया गया
    await TransactionModel.create({
      walletId: wallet._id,
      amount: numericAmount,
      type: "credit",
      status: "successful",
      razorpayPaymentId: razorpayPaymentId,
    });

    return res.status(200).send({
      success: true,
      message: `₹${numericAmount} added to wallet successfully.`,
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error("Error in addMoneyController:", error);
    return res.status(500).send({
      success: false,
      message: "Internal Server Error during wallet update",
    });
  }
};

// --- getBalanceController को वैसे ही रहने दें ---
export const getBalanceController = async (req, res) => {
  try {
    const { phone_no } = req.params;
    if (!phone_no) {
      return res.status(400).send({ message: "Phone number is required." });
    }
    const wallet = await WalletModel.findOne({ phone_no });
    if (!wallet) {
      return res.status(200).send({ success: true, balance: 0 });
    }
    return res.status(200).send({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error("Error in getBalanceController:", error);
    return res
      .status(500)
      .send({ success: false, message: "Internal Server Error" });
  }
};
