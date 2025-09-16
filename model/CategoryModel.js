// model/CategoryModel.js
import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  icon: { type: String, required: true },
});

export default mongoose.model("Category", categorySchema);
