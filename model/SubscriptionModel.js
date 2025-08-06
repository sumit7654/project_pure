import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    phone_no: {
      type: String,
      required: true,
      index: true,
    },
    plan: {
      name: { type: String, required: true }, // जैसे "1 Litre Milk"
      price_per_day: { type: Number, required: true }, // हर दिन का दाम
    },
    validity_start_date: {
      type: Date,
      required: true,
    },
    validity_end_date: {
      type: Date,
      required: true,
    },
    // जिन दिनों डिलीवरी नहीं चाहिए
    skip_days: {
      type: [String], // যেমন ['Saturday', 'Sunday']
      default: [],
    },
    // किसी खास तारीख को डिलीवरी रोकने के लिए
    paused_dates: {
      type: [Date],
      default: [],
    },
    is_active: {
      type: Boolean,
      default: true, // सब्सक्रिप्शन चालू है या नहीं
    },
    // आखिरी बार पैसा कब कटा, ताकि एक दिन में दो बार न कटे
    last_deduction_date: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Subscription", subscriptionSchema);
