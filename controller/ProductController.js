// controller/ProductController.js
import ProductModel from "../model/ProductModel.js";
import CategoryModel from "../model/CategoryModel.js"; // ✅ 1. Import the CategoryModel

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
    // ✅ Get the new optional field from the body
    const {
      name,
      price,
      category,
      volume,
      image,
      newCategoryIcon,
      originalPrice,
      infoTag,
      isMostSubscribed,
      discount,
      trialOffer,
      detail,
    } = req.body;

    // --- Validation ---
    if (!name || !price || !category || !volume || !image) {
      return res
        .status(400)
        .send({ success: false, message: "Required fields are missing." });
    }

    // "Find or Create" logic for the category
    await CategoryModel.findOneAndUpdate(
      { name: { $regex: new RegExp(`^${category}$`, "i") } }, // Case-insensitive search
      {
        $setOnInsert: {
          // This only runs if a NEW document is created
          name: category,
          id: new Date().getTime().toString(),
          // Use the new icon URL if provided, otherwise use a default placeholder
          icon:
            newCategoryIcon ||
            "https://placehold.co/100x100/CCCCCC/FFFFFF?text=Icon",
        },
      },
      { upsert: true } // The magic: if it can't find one, it creates one
    );
    // --- Create the Product ---
    // The `create` method takes an object with all the fields.
    const newProduct = await ProductModel.create({
      id: new Date().getTime().toString(), // Generate a simple unique ID
      name,
      price,
      category,
      volume,
      image,
      originalPrice,
      infoTag,
      isMostSubscribed,
      discount,
      trialOffer,
      detail,
    });

    res.status(201).send({
      success: true,
      message: "Product created successfully!",
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
    const { category, newCategoryIcon, ...productData } = req.body;

    console.log("Product Id is : ", productId);
    console.log("Req params : ", req.params);

    if (category) {
      await CategoryModel.findOneAndUpdate(
        { name: { $regex: new RegExp(`^${category}$`, "i") } },
        {
          $setOnInsert: {
            name: category,
            id: new Date().getTime().toString(),
            icon: newCategoryIcon || "https://path-to-your/default-icon.png",
          },
        },
        { upsert: true }
      );
    }

    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      { category, ...productData },
      { new: true }
    );
    console.log("Update product ", updatedProduct);
    if (!updatedProduct) {
      return res
        .status(404)
        .send({ success: false, message: "Product not found with this ID." });
    }
    res.status(200).send({
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
