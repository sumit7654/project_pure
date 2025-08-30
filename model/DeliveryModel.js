// models/DeliveryModel.js

import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema(
  {
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    delivery_date: { type: String, required: true }, // "YYYY-MM-DD" format
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Cancelled"],
      default: "Pending",
    },
    delivery_boy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional
  },
  { timestamps: true }
);

export default mongoose.model("Delivery", deliverySchema);
