// routes/ProductRoutes.js
import express from "express";
import {
  getProductsController,
  createProductController,
  updateProductController,
  deleteProductController,
} from "../controller/ProductController.js";
// Assuming you have an isAdmin middleware for security
// import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route to get all products
router.get("/", getProductsController);

// Admin-only routes
// In a real app, you would add `isAdmin` middleware before the controller
// Example: router.post("/create", isAdmin, createProductController);
router.post("/create", createProductController);
router.put("/update/:productId", updateProductController);
router.delete("/delete/:productId", deleteProductController);

export default router;
