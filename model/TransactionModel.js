import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    status: {
      type: String, // "successful", "failed", "pending"
      enum: ["successful", "failed", "pending"],
      required: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
