// routes/deliveryRoutes.js

import express from "express";
import {
  createDeliveryController,
  markAsDeliveredController,
} from "../controller/DeliveryController.js";

const router = express.Router();

// Ek specific delivery ko 'Delivered' mark karne ke liye
// PUT /api/deliveries/:deliveryId/complete
router.post("/", createDeliveryController);
router.put("/:deliveryId/complete", markAsDeliveredController);

export default router;
