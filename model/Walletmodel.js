import mongoose from "mongoose";

const WalletModel = new mongoose.Schema(
  {
    phone_no: {
      type: String,
      required: true,
      unique: true, //edited
      // match: /^[6-9]\d{9}$/,
      index: true, //for find fast
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Wallet", WalletModel);
