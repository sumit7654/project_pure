// controller/CategoryController.js
import CategoryModel from "../model/CategoryModel.js";

export const getCategoriesController = async (req, res) => {
  try {
    const categories = await CategoryModel.find({});
    if (!categories || categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No category found in the database.",
      });
    }
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching categories" });
  }
};
