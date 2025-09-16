// routes/CategoryRoutes.js
import express from "express";
import { getCategoriesController } from "../controller/CategoryController.js";

const router = express.Router();

router.get("/", getCategoriesController);

export default router;
