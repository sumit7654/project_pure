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
  isMostSubscribed: { type: Boolean, default: false }, // Use Boolean for true/false
  discount: { type: String },
  trialOffer: { type: String },
  detail: { type: String },
});

export default mongoose.model("Product", productSchema);
