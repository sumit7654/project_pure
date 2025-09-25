import express from "express";
import {
  createSubscriptionController,
  getUserActiveSubscriptionsController,
  getAllUserSubscriptionsController,
  updatePausedDatesController,
  getAllSubscriptionsController, // 💡 Naya, theek kiya hua controller
} from "../controller/SubscriptionController.js";

const router = express.Router();

// Naya subscription banana
router.post("/create", createSubscriptionController);
router.get("/all", getAllSubscriptionsController);

// User ke saare active subscriptions laana
router.get("/user/:phone_no", getUserActiveSubscriptionsController);

// User ki poori history laana
router.get("/history/:phone_no", getAllUserSubscriptionsController);

// 💡 FIX: Ek specific subscription ko uski ID se update karna
router.put("/:subscriptionId/pause-dates", updatePausedDatesController);

export default router;
