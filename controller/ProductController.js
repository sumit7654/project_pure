// controller/ProductController.js
import ProductModel from "../model/ProductModel.js";

export const getProductsController = async (req, res) => {
  try {
    const products = await ProductModel.find({});
    res.status(200).json({ success: true, products });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching products" });
  }
};
