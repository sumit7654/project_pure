// routes/ProductRoutes.js
import express from "express";
import { getProductsController } from "../controller/ProductController.js";

const router = express.Router();

router.get("/", getProductsController);

export default router;
