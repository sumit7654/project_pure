// controller/ProductController.js
import ProductModel from "../model/ProductModel.js";

// GET ALL PRODUCTS
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

// CREATE A NEW PRODUCT
export const createProductController = async (req, res) => {
  try {
    const { name, price, category, volume, image } = req.body;
    if (!name || !price || !category || !volume || !image) {
      return res
        .status(400)
        .send({ success: false, message: "Required fields are missing." });
    }
    const newProduct = await ProductModel.create({
      ...req.body,
      id: new Date().getTime().toString(),
    });
    res
      .status(201)
      .send({
        success: true,
        message: "Product Created!",
        product: newProduct,
      });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error creating product." });
  }
};

// UPDATE AN EXISTING PRODUCT
export const updateProductController = async (req, res) => {
  try {
    const { productId } = req.params;
    const updatedData = req.body;

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      updatedData,
      { new: true }
    );

    if (!updatedProduct) {
      return res
        .status(404)
        .send({ success: false, message: "Product not found." });
    }
    res
      .status(200)
      .send({
        success: true,
        message: "Product Updated!",
        product: updatedProduct,
      });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error updating product." });
  }
};

// DELETE A PRODUCT
export const deleteProductController = async (req, res) => {
  try {
    const { productId } = req.params;
    const deletedProduct = await ProductModel.findByIdAndDelete(productId);
    if (!deletedProduct) {
      return res
        .status(404)
        .send({ success: false, message: "Product not found." });
    }
    res.status(200).send({ success: true, message: "Product Deleted!" });
  } catch (error) {
    res
      .status(500)
      .send({ success: false, message: "Error deleting product." });
  }
};
