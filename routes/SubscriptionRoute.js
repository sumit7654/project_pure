import express from "express";
import {
  createSubscriptionController,
  getSubscriptionController,
  updatePausedDatesController,
} from "../controller/SubscriptionController.js";

const router = express.Router();

router.post("/create", createSubscriptionController);
router.get("/:phone_no", getSubscriptionController);
router.put("/pause-dates/:phone_no", updatePausedDatesController); // Uses phone_no, not subId

export default router;
