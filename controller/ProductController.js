// controller/ProductController.js
import ProductModel from "../model/ProductModel.js";

export const getProductsController = async (req, res) => {
  try {
    // Find the single large document in the collection
    const dataDocument = await ProductModel.findOne({});

    if (!dataDocument || !dataDocument.products) {
      return res
        .status(404)
        .json({ success: false, message: "No products found." });
    }

    // Extract the nested 'products' array from that document
    const productsArray = dataDocument.products;

    // Send only the products array
    res.status(200).json({ success: true, products: productsArray });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error fetching products" });
  }
};
