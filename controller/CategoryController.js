// controller/CategoryController.js
import CategoryModel from "../model/CategoryModel.js";

export const getCategoriesController = async (req, res) => {
  try {
    const categories = await CategoryModel.find({});
    res.status(200).json({ success: true, categories });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching categories" });
  }
};
