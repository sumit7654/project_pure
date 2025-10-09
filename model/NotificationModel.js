import mongoose, { model } from "mongoose";

const NotificationModel = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    message: {
      type: String,
      required: true,
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    type: {
      type: String,
      enum: [
        "subscription_paused",
        "low_balance",
        "payment_successful",
        "referral_bonus",
        "delivery_reminder",
        "offer",
        "general",
      ],
      default: "general",
    },
  },
  {
    timestamps: true,
  }
);

export default model.mongoose("notification", NotificationModel);
