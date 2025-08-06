import express from "express";
import { createSubscriptionController } from "../controller/SubscriptionController.js";

const router = express.Router();

// नया सब्सक्रिप्शन बनाने के लिए रूट
router.post("/create", createSubscriptionController);

export default router;
