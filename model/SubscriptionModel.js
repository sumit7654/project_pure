import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, // User ki unique ID save hogi
      ref: "User", // Ye batata hai ki ye ID 'User' collection se judi hai
      required: true,
    },
    phone_no: {
      type: String,
      required: true,
      index: true,
    },
    plan: {
      productId: { type: String, required: true }, // Asli product ki ID
      productName: { type: String, required: true }, // Product ka naam
      quantity: { type: Number, required: true, default: 1 }, // Kitni quantity
      unit_price: { type: Number, required: true }, // Ek unit ka daam
      price_per_day: { type: Number, required: true }, // Total (quantity * unit_price)
      duration_days: { type: Number, required: true },
    },
    start_date: {
      type: Date,
      required: true,
    },
    validity_end_date: {
      type: Date,
      required: false,
      default: null,
    },
    // जिन दिनों डिलीवरी नहीं चाहिए
    skip_days: {
      type: [String], // ['Saturday', 'Sunday']
      default: [],
    },
    // किसी खास तारीख को डिलीवरी रोकने के लिए
    paused_dates: {
      type: [String], // "YYYY-MM-DD" format mein save hoga
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    last_deduction_date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
