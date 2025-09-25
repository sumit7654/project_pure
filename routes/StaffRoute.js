import express from "express";
import {
  registerStaffController,
  loginStaffController,
  getDashboardStatsController,
  getTodaysDeliveriesController,
  getUnassignedDeliveriesController,
  getAllStaffController,
} from "../controller/UserController.js";
// broadcastNotificationController,

const router = express.Router();

router.post("/register", registerStaffController);
router.post("/login", loginStaffController);
router.get("/all", getAllStaffController);
router.get("/dashboard-stats", getDashboardStatsController);
router.get("/todays-deliveries/:deliveryBoyId", getTodaysDeliveriesController);
router.get("/unassigned-deliveries", getUnassignedDeliveriesController);
// router.post("/broadcast", broadcastNotificationController);

export default router;
