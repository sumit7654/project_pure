// routes/routeRoutes.js
import express from "express";
import { getDeliveryLocationsController } from "../controller/RouteController.js";
import { getOptimizedRouteController } from "../controller/RouteController.js";

const router = express.Router();

// 💡 SUDHAR YAHAN HAI: Route ka naam aur controller badal diya gaya hai
router.get(
  "/delivery-locations/:deliveryBoyId",
  getDeliveryLocationsController
);
router.get("/delivery-route/:userId", getOptimizedRouteController);

export default router;
