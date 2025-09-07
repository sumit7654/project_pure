// routes/routeRoutes.js

import express from "express";
import { getOptimizedRouteController } from "../controller/RouteController.js";

const router = express.Router();

// GET /api/routes/delivery-route/:deliveryBoyId
router.get("/delivery-route/:deliveryBoyId", getOptimizedRouteController);

export default router;
