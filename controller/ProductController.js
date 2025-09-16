// controller/ProductController.js
import ProductModel from "../model/ProductModel.js";

export const getProductsController = async (req, res) => {
  try {
    // Find the single large document in the collection
    const products = await ProductModel.findOne({});

    if (!products || products.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No products found in the database.",
      });
    }

    // Send only the products array
    res.status(200).json({ success: true, products: products });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching products" });
  }
};
