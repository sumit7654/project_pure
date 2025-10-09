// model/ProductModel.js
import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  volume: { type: String, required: true },
  price: { type: String, required: true },
  originalPrice: { type: String },
  image: { type: String, required: true },
  infoTag: { type: String },
  isMostSubscribed: { type: Boolean, default: false }, // Use Boolean for true/false
  discount: { type: String },
  trialOffer: { type: String },
  detail: { type: String },
  quantity: {
    type: Number,
    required: true,
    min: 0, // Quantity cannot be negative
    default: 0, // If not provided, it's out of stock by default
  },
});

export default mongoose.model("Product", productSchema);
