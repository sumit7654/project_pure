import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    status: {
      type: String,
      enum: ["successful", "failed", "pending"],
      required: true,
    },
    razorpayPaymentId: { type: String },
    // 💡 SUDHAR YAHAN HAI: Transaction ka kaaran save karne ke liye
    description: {
      type: String,
      default: "Transaction",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
