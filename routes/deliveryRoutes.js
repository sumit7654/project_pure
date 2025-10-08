// routes/deliveryRoutes.js

import express from "express";
import {
  getTodaysDeliveriesForAdminController,
  getTodaysDeliveryForUserController,
  markAsDeliveredController,
} from "../controller/DeliveryController.js";

const router = express.Router();

// Ek specific delivery ko 'Delivered' mark karne ke liye
// PUT /api/deliveries/:deliveryId/complete
router.put("/:deliveryId/complete", markAsDeliveredController);
router.get("/today", getTodaysDeliveriesForAdminController);
router.get("/user-today/:userId", getTodaysDeliveryForUserController);

export default router;
