import mongoose, { model } from "mongoose";

const NotificationModel = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // 'User' model se joda gaya hai
      required: true,
      index: true, // Ispe index lagane se user ke notifications tezi se milenge
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
        "order confirmed",
        "order deactivated",
      ],
      default: "general",
    },

    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("notification", NotificationModel);
