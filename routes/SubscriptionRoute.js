import express from "express";
import {
  createSubscriptionController,
  getActiveSubscriptionsController, // Updated name
  updatePausedDatesController,
} from "../controller/SubscriptionController.js";

const router = express.Router();

// नया सब्सक्रिप्शन बनाने के लिए रूट
router.post("/create", createSubscriptionController);
router.get("/:phone_no", getActiveSubscriptionsController);

// 3. Paused Dates को अपडेट करने के लिए नया रूट
router.put("/pause-dates/:phone_no", updatePausedDatesController);

export default router;
