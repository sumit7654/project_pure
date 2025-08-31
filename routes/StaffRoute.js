import express from "express";
import {
  registerStaffController,
  loginStaffController,
  getDashboardStatsController,
  getTodaysDeliveriesController,
  getUnassignedDeliveriesController,
} from "../controller/UserController.js";

const router = express.Router();

router.post("/register", registerStaffController);
router.post("/login", loginStaffController);
router.get("/dashboard-stats", getDashboardStatsController);
router.get("/todays-deliveries/:staffId", getTodaysDeliveriesController);
router.get("/unassigned-deliveries", getUnassignedDeliveriesController);

export default router;
