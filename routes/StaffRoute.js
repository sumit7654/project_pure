import express from "express";
import {
  registerStaffController,
  loginStaffController,
  getDashboardStatsController,
  getTodaysDeliveriesController,
  getUnassignedDeliveriesController,
  broadcastNotificationController,
} from "../controller/UserController.js";

const router = express.Router();

router.post("/register", registerStaffController);
router.post("/login", loginStaffController);
router.get("/dashboard-stats", getDashboardStatsController);
router.get("/todays-deliveries/:deliveryBoyId", getTodaysDeliveriesController);
router.get("/unassigned-deliveries", getUnassignedDeliveriesController);
router.post("/broadcast", broadcastNotificationController);

export default router;
